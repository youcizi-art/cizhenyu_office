import { eq } from "drizzle-orm";
import { getDb, schema } from "../../../lib/db";
import { getEnterpriseSession, assertOrgRole, recordAuditLog } from "../../../lib/rbac";
import { hashPassword } from "../../../lib/auth-crypto";
import { jsonResponse, errorResponse } from "../../../utils";
import { PagesContext, OrgRole } from "../../../types";

/**
 * 企业成员列表与新增成员 (GET / POST)
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const session = await getEnterpriseSession(request, env);
  if (!session) {
    return errorResponse("Unauthorized: Enterprise session required", 401);
  }

  try {
    const db = getDb(env);
    const members = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        avatar: schema.users.avatar,
        role: schema.users.role,
        status: schema.users.status,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
      })
      .from(schema.users)
      .where(eq(schema.users.orgId, session.org.id));

    return jsonResponse({
      success: true,
      members,
      org: session.org,
    });
  } catch (err: any) {
    return errorResponse(err.message || "Failed to fetch members", 500);
  }
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const session = await getEnterpriseSession(request, env);
  if (!session) {
    return errorResponse("Unauthorized: Enterprise session required", 401);
  }

  // 必须是 admin 或 owner 才有权限新增成员
  if (!assertOrgRole(session.user.role, "admin")) {
    return errorResponse("Forbidden: Administrator privileges required", 403);
  }

  let body: { email?: string; name?: string; role?: OrgRole; password?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload", 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  const name = (body.name || "").trim();
  const role = body.role || "member";
  const initialPassword = (body.password || "").trim();

  if (!email || !initialPassword) {
    return errorResponse("Email and password are required", 400);
  }

  // 只有 owner 才能直接创建 admin
  if (role === "owner" || (role === "admin" && session.user.role !== "owner")) {
    return errorResponse("Forbidden: Insufficient permissions to grant this role", 403);
  }

  try {
    const db = getDb(env);

    // 1. 席位上限校验
    const currentMembers = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.orgId, session.org.id));

    if (currentMembers.length >= session.org.maxSeats) {
      return errorResponse(
        `Seat limit exceeded: Organization maximum seats is ${session.org.maxSeats}`,
        400
      );
    }

    // 2. 邮箱重复校验
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return errorResponse("User with this email already exists", 409);
    }

    // 3. 密码加盐哈希并落库
    const { hash, salt } = await hashPassword(initialPassword);
    const newUserId = crypto.randomUUID();
    const now = Date.now();

    await db.insert(schema.users).values({
      id: newUserId,
      orgId: session.org.id,
      email,
      passwordHash: hash,
      salt,
      name: name || email.split("@")[0],
      avatar: null,
      role,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // 4. 记录审计日志
    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "member_add",
      targetId: newUserId,
      details: { email, role },
      ipAddress: request.headers.get("CF-Connecting-IP") || undefined,
    });

    return jsonResponse(
      {
        success: true,
        member: {
          id: newUserId,
          email,
          name: name || email.split("@")[0],
          role,
          status: "active",
          createdAt: now,
        },
      },
      201
    );
  } catch (err: any) {
    return errorResponse(err.message || "Failed to add member", 500);
  }
}

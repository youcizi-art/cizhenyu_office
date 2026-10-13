var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// utils.ts
var METADATA_KEY = "_app/metadata.json";
var TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}
__name(jsonResponse, "jsonResponse");
function errorResponse(message, status = 400) {
  return jsonResponse({ error: message, success: false }, status);
}
__name(errorResponse, "errorResponse");
function getConfiguredPassword(env) {
  return env.PASSWORD || env.ACCESS_KEY || null;
}
__name(getConfiguredPassword, "getConfiguredPassword");
async function generateHmac(secret, payload) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateHmac, "generateHmac");
async function createAuthToken(secret) {
  const timestamp = Date.now().toString();
  const signature = await generateHmac(secret, timestamp);
  return `${timestamp}.${signature}`;
}
__name(createAuthToken, "createAuthToken");
async function verifyAuth(request, env) {
  const configuredPassword = getConfiguredPassword(env);
  if (!configuredPassword) {
    return true;
  }
  let token = null;
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }
  if (!token) {
    const cookieHeader = request.headers.get("Cookie");
    if (cookieHeader) {
      const match2 = cookieHeader.match(/office_auth_token=([^;]+)/);
      if (match2) {
        token = decodeURIComponent(match2[1]);
      }
    }
  }
  if (!token) {
    return false;
  }
  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }
  const [timestampStr, providedSig] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > TOKEN_TTL_MS) {
    return false;
  }
  const expectedSig = await generateHmac(configuredPassword, timestampStr);
  return expectedSig === providedSig;
}
__name(verifyAuth, "verifyAuth");
async function loadMetadata(env) {
  const bucket = env.DOCUMENTS_BUCKET;
  if (!bucket) {
    throw new Error("DOCUMENTS_BUCKET is not bound in Cloudflare environment");
  }
  try {
    const object = await bucket.get(METADATA_KEY);
    if (!object) {
      return { categories: [], documents: [] };
    }
    const text = await object.text();
    const data = JSON.parse(text);
    return {
      categories: Array.isArray(data.categories) ? data.categories : [],
      documents: Array.isArray(data.documents) ? data.documents : []
    };
  } catch (error) {
    console.error("Failed to load metadata index:", error);
    return { categories: [], documents: [] };
  }
}
__name(loadMetadata, "loadMetadata");
async function saveMetadata(env, metadata) {
  const bucket = env.DOCUMENTS_BUCKET;
  if (!bucket) {
    throw new Error("DOCUMENTS_BUCKET is not bound in Cloudflare environment");
  }
  const content = JSON.stringify(metadata, null, 2);
  await bucket.put(METADATA_KEY, content, {
    httpMetadata: {
      contentType: "application/json; charset=utf-8"
    }
  });
}
__name(saveMetadata, "saveMetadata");
function generateId() {
  return crypto.randomUUID();
}
__name(generateId, "generateId");

// api/documents/[id]/content.ts
async function onRequestGet(context) {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("\u672A\u6388\u6743\u8BBF\u95EE\uFF0C\u8BF7\u5148\u767B\u5F55", 401);
  }
  const bucket = env.DOCUMENTS_BUCKET;
  if (!bucket) {
    return errorResponse("Cloudflare R2 Bucket \u672A\u7ED1\u5B9A", 500);
  }
  const docId = params.id;
  const metadata = await loadMetadata(env);
  const doc = metadata.documents.find((d) => d.id === docId);
  if (!doc) {
    return errorResponse("\u6587\u6863\u4E0D\u5B58\u5728", 404);
  }
  const object = await bucket.get(doc.r2Key);
  if (!object) {
    return errorResponse("\u5B58\u50A8\u6876\u4E2D\u672A\u627E\u5230\u8BE5\u6587\u6863\u5B9E\u4F53", 404);
  }
  const encodedFileName = encodeURIComponent(doc.name);
  return new Response(object.body, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
      "Content-Length": String(object.size)
    }
  });
}
__name(onRequestGet, "onRequestGet");

// api/documents/[id]/meta.ts
async function onRequestPatch(context) {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("\u672A\u6388\u6743\u8BBF\u95EE\uFF0C\u8BF7\u5148\u767B\u5F55", 401);
  }
  const docId = params.id;
  try {
    const body = await request.json();
    const metadata = await loadMetadata(env);
    const doc = metadata.documents.find((d) => d.id === docId);
    if (!doc) {
      return errorResponse("\u6587\u6863\u4E0D\u5B58\u5728", 404);
    }
    if (typeof body.name === "string" && body.name.trim()) {
      doc.name = body.name.trim();
    }
    if ("categoryId" in body) {
      doc.categoryId = body.categoryId || null;
    }
    doc.updatedAt = Date.now();
    await saveMetadata(env, metadata);
    return jsonResponse({
      success: true,
      document: doc
    });
  } catch (err) {
    return errorResponse("\u4FEE\u6539\u5143\u6570\u636E\u5931\u8D25: " + String(err), 500);
  }
}
__name(onRequestPatch, "onRequestPatch");

// api/documents/[id]/share.ts
async function onRequestPost(context) {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("\u672A\u6388\u6743\u8BBF\u95EE\uFF0C\u8BF7\u5148\u767B\u5F55", 401);
  }
  const docId = params.id;
  try {
    const metadata = await loadMetadata(env);
    const doc = metadata.documents.find((d) => d.id === docId);
    if (!doc) {
      return errorResponse("\u6587\u6863\u4E0D\u5B58\u5728", 404);
    }
    const shareToken = generateId().replace(/-/g, "").substring(0, 16);
    doc.shareToken = shareToken;
    doc.updatedAt = Date.now();
    await saveMetadata(env, metadata);
    return jsonResponse({
      success: true,
      shareToken,
      document: doc
    });
  } catch (err) {
    return errorResponse("\u8BBE\u7F6E\u5206\u4EAB\u5931\u8D25: " + String(err), 500);
  }
}
__name(onRequestPost, "onRequestPost");
async function onRequestDelete(context) {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("\u672A\u6388\u6743\u8BBF\u95EE\uFF0C\u8BF7\u5148\u767B\u5F55", 401);
  }
  const docId = params.id;
  try {
    const metadata = await loadMetadata(env);
    const doc = metadata.documents.find((d) => d.id === docId);
    if (!doc) {
      return errorResponse("\u6587\u6863\u4E0D\u5B58\u5728", 404);
    }
    delete doc.shareToken;
    doc.updatedAt = Date.now();
    await saveMetadata(env, metadata);
    return jsonResponse({
      success: true,
      message: "\u5DF2\u5173\u95ED\u5206\u4EAB",
      document: doc
    });
  } catch (err) {
    return errorResponse("\u5173\u95ED\u5206\u4EAB\u5931\u8D25: " + String(err), 500);
  }
}
__name(onRequestDelete, "onRequestDelete");

// api/share/[token]/download.ts
async function onRequestGet2(context) {
  const { env, params } = context;
  const token = params.token;
  if (!token) {
    return errorResponse("\u7F3A\u5C11\u5206\u4EAB\u51ED\u8BC1", 400);
  }
  const bucket = env.DOCUMENTS_BUCKET;
  if (!bucket) {
    return errorResponse("\u5B58\u50A8\u670D\u52A1\u672A\u5C31\u7EEA", 500);
  }
  const metadata = await loadMetadata(env);
  const doc = metadata.documents.find((d) => d.shareToken === token);
  if (!doc) {
    return errorResponse("\u5206\u4EAB\u94FE\u63A5\u4E0D\u5B58\u5728\u6216\u5DF2\u5931\u6548", 404);
  }
  const object = await bucket.get(doc.r2Key);
  if (!object) {
    return errorResponse("\u5B58\u50A8\u6876\u4E2D\u672A\u627E\u5230\u8BE5\u6587\u6863\u5B9E\u4F53", 404);
  }
  const encodedFileName = encodeURIComponent(doc.name);
  return new Response(object.body, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
      "Content-Length": String(object.size)
    }
  });
}
__name(onRequestGet2, "onRequestGet");

// api/share/[token]/info.ts
async function onRequestGet3(context) {
  const { env, params } = context;
  const token = params.token;
  if (!token) {
    return errorResponse("\u7F3A\u5C11\u5206\u4EAB\u51ED\u8BC1", 400);
  }
  if (!env.DOCUMENTS_BUCKET) {
    return errorResponse("\u5B58\u50A8\u670D\u52A1\u672A\u5C31\u7EEA", 500);
  }
  const metadata = await loadMetadata(env);
  const doc = metadata.documents.find((d) => d.shareToken === token);
  if (!doc) {
    return errorResponse("\u5206\u4EAB\u94FE\u63A5\u4E0D\u5B58\u5728\u6216\u5DF2\u5931\u6548", 404);
  }
  return jsonResponse({
    name: doc.name,
    type: doc.type,
    size: doc.size,
    updatedAt: doc.updatedAt
  });
}
__name(onRequestGet3, "onRequestGet");

// api/auth/check.ts
async function onRequestGet4(context) {
  const { request, env } = context;
  const configuredPassword = getConfiguredPassword(env);
  if (!configuredPassword) {
    return jsonResponse({
      authenticated: true,
      requiresPassword: false
    });
  }
  const isValid = await verifyAuth(request, env);
  return jsonResponse({
    authenticated: isValid,
    requiresPassword: true
  });
}
__name(onRequestGet4, "onRequestGet");

// api/auth/login.ts
async function onRequestPost2(context) {
  const { request, env } = context;
  const configuredPassword = getConfiguredPassword(env);
  if (!configuredPassword) {
    return jsonResponse({
      success: true,
      message: "No password configured. Logged in directly.",
      token: "open_mode"
    });
  }
  try {
    const body = await request.json();
    const inputPassword = body?.password?.trim() || "";
    if (inputPassword !== configuredPassword) {
      return errorResponse("\u8BBF\u95EE\u5BC6\u94A5\u4E0D\u6B63\u786E\uFF0C\u8BF7\u91CD\u65B0\u8F93\u5165", 401);
    }
    const token = await createAuthToken(configuredPassword);
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      `office_auth_token=${encodeURIComponent(
        token
      )}; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly`
    );
    return new Response(
      JSON.stringify({
        success: true,
        token
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Set-Cookie": headers.get("Set-Cookie") || ""
        }
      }
    );
  } catch (err) {
    return errorResponse("\u89E3\u6790\u8BF7\u6C42\u5931\u8D25: " + String(err), 400);
  }
}
__name(onRequestPost2, "onRequestPost");

// api/auth/logout.ts
async function onRequestPost3(_context) {
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    "office_auth_token=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly"
  );
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": headers.get("Set-Cookie") || ""
    }
  });
}
__name(onRequestPost3, "onRequestPost");

// api/categories/[id].ts
async function onRequestPatch2(context) {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("\u672A\u6388\u6743\u8BBF\u95EE\uFF0C\u8BF7\u5148\u767B\u5F55", 401);
  }
  const categoryId = params.id;
  try {
    const body = await request.json();
    const name = body?.name?.trim();
    if (!name) {
      return errorResponse("\u5206\u7C7B\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A", 400);
    }
    const metadata = await loadMetadata(env);
    const category = metadata.categories.find((c) => c.id === categoryId);
    if (!category) {
      return errorResponse("\u5206\u7C7B\u4E0D\u5B58\u5728", 404);
    }
    category.name = name;
    await saveMetadata(env, metadata);
    return jsonResponse({
      success: true,
      category
    });
  } catch (err) {
    return errorResponse("\u66F4\u65B0\u5206\u7C7B\u5931\u8D25: " + String(err), 500);
  }
}
__name(onRequestPatch2, "onRequestPatch");
async function onRequestDelete2(context) {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("\u672A\u6388\u6743\u8BBF\u95EE\uFF0C\u8BF7\u5148\u767B\u5F55", 401);
  }
  const categoryId = params.id;
  try {
    const metadata = await loadMetadata(env);
    const index = metadata.categories.findIndex((c) => c.id === categoryId);
    if (index === -1) {
      return errorResponse("\u5206\u7C7B\u4E0D\u5B58\u5728", 404);
    }
    const toDeleteIds = /* @__PURE__ */ new Set([categoryId]);
    let added = true;
    while (added) {
      added = false;
      for (const cat of metadata.categories) {
        if (cat.parentId && toDeleteIds.has(cat.parentId) && !toDeleteIds.has(cat.id)) {
          toDeleteIds.add(cat.id);
          added = true;
        }
      }
    }
    for (const doc of metadata.documents) {
      if (doc.categoryId && toDeleteIds.has(doc.categoryId)) {
        doc.categoryId = null;
      }
    }
    metadata.categories = metadata.categories.filter((c) => !toDeleteIds.has(c.id));
    await saveMetadata(env, metadata);
    return jsonResponse({
      success: true,
      deletedCategoryIds: Array.from(toDeleteIds)
    });
  } catch (err) {
    return errorResponse("\u5220\u9664\u5206\u7C7B\u5931\u8D25: " + String(err), 500);
  }
}
__name(onRequestDelete2, "onRequestDelete");

// api/documents/[id].ts
async function onRequestPut(context) {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("\u672A\u6388\u6743\u8BBF\u95EE\uFF0C\u8BF7\u5148\u767B\u5F55", 401);
  }
  const bucket = env.DOCUMENTS_BUCKET;
  if (!bucket) {
    return errorResponse("Cloudflare R2 Bucket \u672A\u7ED1\u5B9A", 500);
  }
  const docId = params.id;
  if (!docId) {
    return errorResponse("\u7F3A\u5C11\u6587\u6863 ID", 400);
  }
  try {
    const metadata = await loadMetadata(env);
    const docIndex = metadata.documents.findIndex((d) => d.id === docId);
    if (docIndex === -1) {
      return errorResponse("\u6587\u6863\u4E0D\u5B58\u5728", 404);
    }
    const doc = metadata.documents[docIndex];
    const arrayBuffer = await request.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return errorResponse("\u4E0A\u4F20\u7684\u5185\u5BB9\u4E3A\u7A7A", 400);
    }
    await bucket.put(doc.r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: "application/octet-stream"
      }
    });
    doc.size = arrayBuffer.byteLength;
    doc.updatedAt = Date.now();
    metadata.documents[docIndex] = doc;
    await saveMetadata(env, metadata);
    return jsonResponse({
      success: true,
      document: doc
    });
  } catch (err) {
    return errorResponse("\u66F4\u65B0\u6587\u6863\u5931\u8D25: " + String(err), 500);
  }
}
__name(onRequestPut, "onRequestPut");
async function onRequestDelete3(context) {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("\u672A\u6388\u6743\u8BBF\u95EE\uFF0C\u8BF7\u5148\u767B\u5F55", 401);
  }
  const bucket = env.DOCUMENTS_BUCKET;
  if (!bucket) {
    return errorResponse("Cloudflare R2 Bucket \u672A\u7ED1\u5B9A", 500);
  }
  const docId = params.id;
  if (!docId) {
    return errorResponse("\u7F3A\u5C11\u6587\u6863 ID", 400);
  }
  try {
    const metadata = await loadMetadata(env);
    const docIndex = metadata.documents.findIndex((d) => d.id === docId);
    if (docIndex === -1) {
      return errorResponse("\u6587\u6863\u4E0D\u5B58\u5728", 404);
    }
    const doc = metadata.documents[docIndex];
    await bucket.delete(doc.r2Key);
    metadata.documents.splice(docIndex, 1);
    await saveMetadata(env, metadata);
    return jsonResponse({
      success: true,
      message: "\u6587\u6863\u5DF2\u5220\u9664"
    });
  } catch (err) {
    return errorResponse("\u5220\u9664\u6587\u6863\u5931\u8D25: " + String(err), 500);
  }
}
__name(onRequestDelete3, "onRequestDelete");

// api/categories/index.ts
async function onRequestPost4(context) {
  const { request, env } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("\u672A\u6388\u6743\u8BBF\u95EE\uFF0C\u8BF7\u5148\u767B\u5F55", 401);
  }
  try {
    const body = await request.json();
    const name = body?.name?.trim();
    if (!name) {
      return errorResponse("\u5206\u7C7B\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A", 400);
    }
    const metadata = await loadMetadata(env);
    const parentId = body.parentId || null;
    if (parentId) {
      const parentExists = metadata.categories.some((c) => c.id === parentId);
      if (!parentExists) {
        return errorResponse("\u6307\u5B9A\u7684\u7236\u5206\u7C7B\u4E0D\u5B58\u5728", 404);
      }
    }
    const newCategory = {
      id: generateId(),
      name,
      parentId,
      createdAt: Date.now()
    };
    metadata.categories.push(newCategory);
    await saveMetadata(env, metadata);
    return jsonResponse({
      success: true,
      category: newCategory
    });
  } catch (err) {
    return errorResponse("\u521B\u5EFA\u5206\u7C7B\u5931\u8D25: " + String(err), 500);
  }
}
__name(onRequestPost4, "onRequestPost");

// api/documents/index.ts
async function onRequestGet5(context) {
  const { request, env } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("\u672A\u6388\u6743\u8BBF\u95EE\uFF0C\u8BF7\u5148\u767B\u5F55", 401);
  }
  if (!env.DOCUMENTS_BUCKET) {
    return errorResponse("Cloudflare R2 Bucket \u672A\u7ED1\u5B9A (DOCUMENTS_BUCKET)", 500);
  }
  const metadata = await loadMetadata(env);
  return jsonResponse(metadata);
}
__name(onRequestGet5, "onRequestGet");
async function onRequestPost5(context) {
  const { request, env } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("\u672A\u6388\u6743\u8BBF\u95EE\uFF0C\u8BF7\u5148\u767B\u5F55", 401);
  }
  const bucket = env.DOCUMENTS_BUCKET;
  if (!bucket) {
    return errorResponse("Cloudflare R2 Bucket \u672A\u7ED1\u5B9A (DOCUMENTS_BUCKET)", 500);
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const name = (formData.get("name") || "").trim();
    const type = (formData.get("type") || "docx").toLowerCase();
    const categoryId = formData.get("categoryId") || null;
    if (!file) {
      return errorResponse("\u672A\u5305\u542B\u6587\u4EF6\u6570\u636E", 400);
    }
    if (!name) {
      return errorResponse("\u6587\u6863\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A", 400);
    }
    const docId = generateId();
    const r2Key = `files/${docId}.${type}`;
    const arrayBuffer = await file.arrayBuffer();
    const size = arrayBuffer.byteLength;
    const now = Date.now();
    await bucket.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: "application/octet-stream"
      },
      customMetadata: {
        docId,
        fileName: encodeURIComponent(name)
      }
    });
    const metadata = await loadMetadata(env);
    const newDoc = {
      id: docId,
      name,
      type,
      categoryId: categoryId === "" ? null : categoryId,
      r2Key,
      size,
      createdAt: now,
      updatedAt: now
    };
    metadata.documents.unshift(newDoc);
    await saveMetadata(env, metadata);
    return jsonResponse({
      success: true,
      document: newDoc
    });
  } catch (err) {
    return errorResponse("\u4FDD\u5B58\u6587\u6863\u5931\u8D25: " + String(err), 500);
  }
}
__name(onRequestPost5, "onRequestPost");

// ../.wrangler/tmp/pages-R8DXrf/functionsRoutes-0.3858293797574699.mjs
var routes = [
  {
    routePath: "/api/documents/:id/content",
    mountPath: "/api/documents/:id",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/documents/:id/meta",
    mountPath: "/api/documents/:id",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch]
  },
  {
    routePath: "/api/documents/:id/share",
    mountPath: "/api/documents/:id",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/documents/:id/share",
    mountPath: "/api/documents/:id",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/share/:token/download",
    mountPath: "/api/share/:token",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/share/:token/info",
    mountPath: "/api/share/:token",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/auth/check",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/auth/login",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/auth/logout",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/categories/:id",
    mountPath: "/api/categories",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete2]
  },
  {
    routePath: "/api/categories/:id",
    mountPath: "/api/categories",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch2]
  },
  {
    routePath: "/api/documents/:id",
    mountPath: "/api/documents",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete3]
  },
  {
    routePath: "/api/documents/:id",
    mountPath: "/api/documents",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  },
  {
    routePath: "/api/categories",
    mountPath: "/api/categories",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/documents",
    mountPath: "/api/documents",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/documents",
    mountPath: "/api/documents",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  }
];

// C:/Users/Administrator/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// C:/Users/Administrator/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};

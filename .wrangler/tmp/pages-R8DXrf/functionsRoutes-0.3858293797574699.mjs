import { onRequestGet as __api_documents__id__content_ts_onRequestGet } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\documents\\[id]\\content.ts"
import { onRequestPatch as __api_documents__id__meta_ts_onRequestPatch } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\documents\\[id]\\meta.ts"
import { onRequestDelete as __api_documents__id__share_ts_onRequestDelete } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\documents\\[id]\\share.ts"
import { onRequestPost as __api_documents__id__share_ts_onRequestPost } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\documents\\[id]\\share.ts"
import { onRequestGet as __api_share__token__download_ts_onRequestGet } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\share\\[token]\\download.ts"
import { onRequestGet as __api_share__token__info_ts_onRequestGet } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\share\\[token]\\info.ts"
import { onRequestGet as __api_auth_check_ts_onRequestGet } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\auth\\check.ts"
import { onRequestPost as __api_auth_login_ts_onRequestPost } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\auth\\login.ts"
import { onRequestPost as __api_auth_logout_ts_onRequestPost } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\auth\\logout.ts"
import { onRequestDelete as __api_categories__id__ts_onRequestDelete } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\categories\\[id].ts"
import { onRequestPatch as __api_categories__id__ts_onRequestPatch } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\categories\\[id].ts"
import { onRequestDelete as __api_documents__id__ts_onRequestDelete } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\documents\\[id].ts"
import { onRequestPut as __api_documents__id__ts_onRequestPut } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\documents\\[id].ts"
import { onRequestPost as __api_categories_index_ts_onRequestPost } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\categories\\index.ts"
import { onRequestGet as __api_documents_index_ts_onRequestGet } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\documents\\index.ts"
import { onRequestPost as __api_documents_index_ts_onRequestPost } from "D:\\ycz_me\\objct\\office-website\\office-website\\functions\\api\\documents\\index.ts"

export const routes = [
    {
      routePath: "/api/documents/:id/content",
      mountPath: "/api/documents/:id",
      method: "GET",
      middlewares: [],
      modules: [__api_documents__id__content_ts_onRequestGet],
    },
  {
      routePath: "/api/documents/:id/meta",
      mountPath: "/api/documents/:id",
      method: "PATCH",
      middlewares: [],
      modules: [__api_documents__id__meta_ts_onRequestPatch],
    },
  {
      routePath: "/api/documents/:id/share",
      mountPath: "/api/documents/:id",
      method: "DELETE",
      middlewares: [],
      modules: [__api_documents__id__share_ts_onRequestDelete],
    },
  {
      routePath: "/api/documents/:id/share",
      mountPath: "/api/documents/:id",
      method: "POST",
      middlewares: [],
      modules: [__api_documents__id__share_ts_onRequestPost],
    },
  {
      routePath: "/api/share/:token/download",
      mountPath: "/api/share/:token",
      method: "GET",
      middlewares: [],
      modules: [__api_share__token__download_ts_onRequestGet],
    },
  {
      routePath: "/api/share/:token/info",
      mountPath: "/api/share/:token",
      method: "GET",
      middlewares: [],
      modules: [__api_share__token__info_ts_onRequestGet],
    },
  {
      routePath: "/api/auth/check",
      mountPath: "/api/auth",
      method: "GET",
      middlewares: [],
      modules: [__api_auth_check_ts_onRequestGet],
    },
  {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_login_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/logout",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_logout_ts_onRequestPost],
    },
  {
      routePath: "/api/categories/:id",
      mountPath: "/api/categories",
      method: "DELETE",
      middlewares: [],
      modules: [__api_categories__id__ts_onRequestDelete],
    },
  {
      routePath: "/api/categories/:id",
      mountPath: "/api/categories",
      method: "PATCH",
      middlewares: [],
      modules: [__api_categories__id__ts_onRequestPatch],
    },
  {
      routePath: "/api/documents/:id",
      mountPath: "/api/documents",
      method: "DELETE",
      middlewares: [],
      modules: [__api_documents__id__ts_onRequestDelete],
    },
  {
      routePath: "/api/documents/:id",
      mountPath: "/api/documents",
      method: "PUT",
      middlewares: [],
      modules: [__api_documents__id__ts_onRequestPut],
    },
  {
      routePath: "/api/categories",
      mountPath: "/api/categories",
      method: "POST",
      middlewares: [],
      modules: [__api_categories_index_ts_onRequestPost],
    },
  {
      routePath: "/api/documents",
      mountPath: "/api/documents",
      method: "GET",
      middlewares: [],
      modules: [__api_documents_index_ts_onRequestGet],
    },
  {
      routePath: "/api/documents",
      mountPath: "/api/documents",
      method: "POST",
      middlewares: [],
      modules: [__api_documents_index_ts_onRequestPost],
    },
  ]
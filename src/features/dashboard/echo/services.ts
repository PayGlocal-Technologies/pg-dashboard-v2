import { BASE_URL_V1 } from "@/api";

/**
 * The one and only Echo endpoint. Every turn of the conversation — the opening
 * handshake, a typed message, a tapped button, a picked list row — is a POST
 * to this URL; the server owns the session (keyed off the auth cookie) and
 * decides what the next screen is. See APP_RENDERING_GUIDE.md.
 *
 * pg-dashboard has no client for this endpoint, so there is no v1 service file
 * to diff against: the contract here comes from the rendering guide.
 */
export const echoAppApi = `${BASE_URL_V1}/echo/app`;

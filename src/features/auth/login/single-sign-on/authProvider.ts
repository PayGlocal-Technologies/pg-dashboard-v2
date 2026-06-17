import { GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";

type ProviderId = "google.com" | "facebook.com" | "meta.com";
type ProviderType = "google" | "meta";

export const PROVIDERS: Record<ProviderId, ProviderType> = {
  "google.com": "google",
  "facebook.com": "meta",
  "meta.com": "meta",
};

export function authProvider(id: ProviderType): GoogleAuthProvider | FacebookAuthProvider {
  switch (id) {
    case "google": {
      const p = new GoogleAuthProvider();
      p.addScope("email");
      p.addScope("profile");
      p.addScope("openid");
      return p;
    }
    case "meta": {
      const p = new FacebookAuthProvider();
      p.addScope("email");
      p.addScope("public_profile");
      p.setCustomParameters({ auth_type: "rerequest" });
      return p;
    }
  }
}

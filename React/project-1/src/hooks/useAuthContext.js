import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function useAuthContext() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuthContext requires AuthProvider.");
  return auth;
}

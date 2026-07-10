/**
 * localClient.ts
 * Drop-in replacement for Supabase client pointing to local Express server.
 * Set VITE_USE_LOCAL_SERVER=true + VITE_LOCAL_SERVER_URL=http://localhost:3001
 */

const BASE_URL =
  import.meta.env.VITE_LOCAL_SERVER_URL || "http://localhost:3001";

let _token: string | null = localStorage.getItem("emtaa_token");

const setToken = (token: string | null) => {
  _token = token;
  if (token) localStorage.setItem("emtaa_token", token);
  else localStorage.removeItem("emtaa_token");
};

const headers = () => ({
  "Content-Type": "application/json",
  ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
});

const apiFetch = async (method: string, path: string, body?: unknown) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw json.error || json;
  return json;
};

class QueryBuilder {
  private _table: string;
  private _filters: string[] = [];
  private _limit = 100;
  private _offset = 0;
  private _order = "";
  private _method = "GET";
  private _body: unknown;
  private _single = false;

  constructor(table: string) { this._table = table; }
  eq(col: string, val: unknown) { this._filters.push(`${col}=eq.${val}`); return this; }
  neq(col: string, val: unknown) { this._filters.push(`${col}=neq.${val}`); return this; }
  ilike(col: string, val: string) { this._filters.push(`${col}=ilike.${val}`); return this; }
  limit(n: number) { this._limit = n; return this; }
  range(from: number, to: number) { this._offset = from; this._limit = to - from + 1; return this; }
  order(col: string, opts?: { ascending?: boolean }) {
    this._order = `${col}.${opts?.ascending === false ? "desc" : "asc"}`;
    return this;
  }
  select(_cols = "*") { return this; }
  single() { this._single = true; return this; }
  maybeSingle() { this._single = true; return this; }
  insert(data: unknown) { this._method = "POST"; this._body = data; return this; }
  update(data: unknown) { this._method = "PATCH"; this._body = data; return this; }
  upsert(data: unknown) { this._method = "POST"; this._body = data; return this; }
  delete() { this._method = "DELETE"; return this; }

  async then(
    resolve: (v: { data: unknown; error: unknown }) => void,
    reject: (e: unknown) => void
  ) {
    try {
      const params = new URLSearchParams();
      if (this._limit) params.set("limit", String(this._limit));
      if (this._offset) params.set("offset", String(this._offset));
      if (this._order) params.set("order", this._order);
      this._filters.forEach((f) => {
        const idx = f.indexOf("=");
        params.set(f.slice(0, idx), f.slice(idx + 1));
      });
      const qs = params.toString();
      const url = `/rest/v1/${this._table}${qs ? "?" + qs : ""}`;

      let data;
      if (this._method === "GET") data = await apiFetch("GET", url);
      else if (this._method === "POST") data = await apiFetch("POST", url, this._body);
      else if (this._method === "PATCH") data = await apiFetch("PATCH", url, this._body);
      else if (this._method === "DELETE") data = await apiFetch("DELETE", url);

      if (this._single) {
        const arr = Array.isArray(data) ? data : [data];
        resolve({ data: arr[0] ?? null, error: null });
      } else {
        resolve({ data: Array.isArray(data) ? data : [data], error: null });
      }
    } catch (err) {
      reject({ data: null, error: err });
    }
  }
}

export const localClient = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        const data = await apiFetch("POST", "/auth/v1/token", { email, password });
        setToken(data.access_token);
        return { data: { session: { access_token: data.access_token, user: data.user }, user: data.user }, error: null };
      } catch (err) {
        return { data: { session: null, user: null }, error: err };
      }
    },
    signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) => {
      try {
        const data = await apiFetch("POST", "/auth/v1/signup", { email, password, data: options?.data });
        setToken(data.access_token);
        return { data: { session: { access_token: data.access_token, user: data.user }, user: data.user }, error: null };
      } catch (err) {
        return { data: { session: null, user: null }, error: err };
      }
    },
    signOut: async () => {
      try { await apiFetch("POST", "/auth/v1/logout"); } catch { /* noop */ }
      setToken(null);
      return { error: null };
    },
    getSession: async () => {
      if (!_token) return { data: { session: null }, error: null };
      try {
        const user = await apiFetch("GET", "/auth/v1/user");
        return { data: { session: { access_token: _token, user } }, error: null };
      } catch {
        setToken(null);
        return { data: { session: null }, error: null };
      }
    },
    getUser: async () => {
      if (!_token) return { data: { user: null }, error: null };
      try {
        const user = await apiFetch("GET", "/auth/v1/user");
        return { data: { user }, error: null };
      } catch (err) {
        return { data: { user: null }, error: err };
      }
    },
    onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
      setTimeout(async () => {
        const { data } = await localClient.auth.getSession();
        cb(data.session ? "SIGNED_IN" : "SIGNED_OUT", data.session);
      }, 100);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    resetPasswordForEmail: async (email: string) => {
      console.log("[LOCAL] Password reset for:", email);
      return { error: null };
    },
    signInWithOtp: async ({ email }: { email: string }) => {
      console.log("[LOCAL] OTP for:", email);
      return { error: null };
    },
  },

  from: (table: string) => new QueryBuilder(table),

  rpc: async (fn: string, args?: unknown) => {
    try {
      const data = await apiFetch("POST", `/rest/v1/rpc/${fn}`, args || {});
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  storage: {
    from: (_bucket: string) => ({
      upload: async (path: string, _file: File) => ({ data: { path }, error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `${BASE_URL}/storage/${path}` } }),
      remove: async () => ({ error: null }),
    }),
  },

  channel: (_name: string) => ({ on: () => ({ subscribe: () => {} }), subscribe: () => {} }),
  removeChannel: () => {},
};

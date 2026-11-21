/**
 * The host's session token, kept on this device only. It is a bearer credential,
 * so it lives in localStorage (not a cookie) and every request carries it in the
 * x-host-token header. Signing out deletes both the token and the server session.
 */
const KEY = 'islebnb.hosttoken.v1'

export const getHostToken = () => {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export const setHostToken = (token: string) => {
  try {
    window.localStorage.setItem(KEY, token)
  } catch {
    // Private mode: the session lasts until the tab closes.
  }
}

export const clearHostToken = () => {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}

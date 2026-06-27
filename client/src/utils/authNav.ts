export type AuthMeResponse = {
  authenticated: boolean
  username?: string
  mustChangePassword?: boolean
}

export function getPostLoginPath(auth: AuthMeResponse): string {
  if (auth.mustChangePassword) return '/admin/change-password'
  return '/admin/flows'
}

export function getAuthNav(auth: AuthMeResponse | null): { label: 'Login' | 'Manage'; to: string } {
  if (auth?.authenticated) {
    return { label: 'Manage', to: getPostLoginPath(auth) }
  }
  return { label: 'Login', to: '/admin/login' }
}

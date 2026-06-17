import { Link, useLocation, useParams } from 'react-router-dom'

export function FlowWorkflowNav() {
  const { slug = '' } = useParams<{ slug: string }>()
  const location = useLocation()
  const base = `/admin/flows/${slug}`
  const isEditor = location.pathname === base || location.pathname === `${base}/`
  const isSeedChat = location.pathname.startsWith(`${base}/seed-chat`)

  return (
    <nav className="flow-editor-workflow-nav" aria-label="Flow workflow">
      <Link to={base} className={`admin-flow-tab${isEditor ? ' is-active' : ''}`}>
        Flow editor
      </Link>
      <Link to={`${base}/seed-chat`} className={`admin-flow-tab${isSeedChat ? ' is-active' : ''}`}>
        Chat scripts
      </Link>
    </nav>
  )
}

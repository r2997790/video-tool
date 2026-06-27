import { Link } from 'react-router-dom'
import { HELP_SECTIONS } from '../../adminHelpGuide'

export function HelpPage() {
  return (
    <div className="admin-help-page">
      <header className="admin-help-header">
        <h1>Help</h1>
        <p className="admin-help-lead">
          Everything you need to build, publish, and run interactive video demos and live events.
        </p>
      </header>

      <div className="admin-help-layout">
        <nav className="admin-help-toc" aria-label="Help sections">
          <p className="admin-help-toc-title">On this page</p>
          <ol>
            {HELP_SECTIONS.map(section => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="admin-help-content">
          {HELP_SECTIONS.map(section => (
            <section key={section.id} id={section.id} className="admin-help-section">
              <h2>{section.title}</h2>
              <p>{section.intro}</p>

              {section.steps && section.steps.length > 0 && (
                <>
                  <h3>Steps</h3>
                  <ol className="admin-help-steps">
                    {section.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </>
              )}

              {section.bullets && section.bullets.length > 0 && (
                <>
                  <h3>{section.steps ? 'Tips' : 'Things to know'}</h3>
                  <ul className="admin-help-bullets">
                    {section.bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                </>
              )}

              {section.links && section.links.length > 0 && (
                <>
                  <h3>Go to</h3>
                  <ul className="admin-help-links">
                    {section.links.map(link => (
                      <li key={link.to}>
                        <Link to={link.to}>{link.label}</Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {section.screenshot && (
                <figure className="admin-help-figure">
                  <img
                    src={section.screenshot.src}
                    alt={section.screenshot.alt}
                    loading="lazy"
                    width={800}
                    height={450}
                  />
                  <figcaption>{section.screenshot.caption}</figcaption>
                </figure>
              )}

              {section.tip && (
                <aside className="admin-help-tip">
                  <strong>Tip:</strong> {section.tip}
                </aside>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

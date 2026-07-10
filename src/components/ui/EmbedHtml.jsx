import { useEffect, useRef } from 'react'

// Renders third-party embed snippets that include <script> tags (Getty
// Images' embed being the main case). Browsers never execute <script>
// elements inserted via innerHTML/dangerouslySetInnerHTML -- so we set the
// markup, then manually recreate each <script> tag and re-insert it, which
// does force execution. Used here so the admin's own preview actually shows
// the photo instead of just the bare Getty credit link.
export default function EmbedHtml({ html, className = '' }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !html) return

    container.innerHTML = html

    const scripts = Array.from(container.querySelectorAll('script'))
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script')
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value))
      newScript.textContent = oldScript.textContent
      oldScript.parentNode.replaceChild(newScript, oldScript)
    })
  }, [html])

  if (!html) return null
  return <div ref={containerRef} className={className} />
}

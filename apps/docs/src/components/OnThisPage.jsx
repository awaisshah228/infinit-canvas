export default function OnThisPage({ links }) {
  return (
    <nav className="on-this-page">
      <h4>On This Page</h4>
      {links.map((link) => (
        <a key={link.href} href={link.href}>{link.label}</a>
      ))}
    </nav>
  );
}

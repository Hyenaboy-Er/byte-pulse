export const metadata = { title: 'Privacy' };

export default function Privacy() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-3xl font-display font-extrabold mb-6">Privacy</h1>
      <p>We collect and process personal data only when technically necessary to deliver this site.</p>

      <h2>Newsletter</h2>
      <p>Your email address is stored only to send you the newsletter. Unsubscribe with the link in every email.</p>

      <h2>Server logs</h2>
      <p>When you visit, the hosting provider records technical information such as IP address and user-agent to keep the site running.</p>

      <h2>Advertising</h2>
      <p>If AdSense is enabled, Google may set cookies. Details: policies.google.com/technologies/ads</p>

      <h2>Your rights</h2>
      <p>To request access, correction, or deletion of your data, email the address on the About page.</p>
    </div>
  );
}

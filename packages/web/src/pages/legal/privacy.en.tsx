import type { LegalDocument } from './types';

export const privacyEn: LegalDocument = {
  title: 'Privacy notice',
  summary: 'No user accounts and no cookies. Group data is stored in the EU and accessed through a shared group link.',
  lastUpdated: 'November 2026',
  sections: [
    {
      id: 'controller',
      title: 'Data controller',
      content: (
        <p>
          The controller responsible for processing personal data is Moritz Reis (TeilFair), Vienna, Austria.
          Email: <a href="mailto:legal@moritzreis.dev">legal@moritzreis.dev</a>.
        </p>
      ),
    },
    {
      id: 'overview',
      title: 'Overview of data processing',
      content: (
        <p>
          TeilFair is a web app for sharing expenses. It does not require user accounts. Visiting the site involves
          processing technical access data; using the app involves processing the group, member and expense data you enter.
        </p>
      ),
    },
    {
      id: 'hosting',
      title: 'Hosting and processors',
      content: (
        <>
          <p>
            The website is hosted by Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA. Technical server logs may
            include your IP address, access time and requested URL, user agent, referrer, and error or status codes. The
            legal basis is Article 6(1)(f) GDPR (providing, stabilising and securing the website).
          </p>
          <p>
            Vercel and Supabase process data as processors under data processing agreements pursuant to Article 28 GDPR.
            See the <a href="https://vercel.com/legal/dpa" target="_blank" rel="noopener noreferrer">Vercel DPA</a> and{' '}
            <a href="https://supabase.com/legal/dpa" target="_blank" rel="noopener noreferrer">Supabase DPA</a>.
          </p>
        </>
      ),
    },
    {
      id: 'analytics',
      title: 'Vercel Analytics and Speed Insights',
      content: (
        <p>
          We use Vercel Analytics to measure reach in aggregate and Vercel Speed Insights to measure performance. These
          services may process page views, approximate location, device and browser information, and technical performance
          metadata. URLs are sent without query parameters or fragments; group IDs in the path are replaced with{' '}
          <code>[id]</code>. According to Vercel, these services do not use cookies. The legal basis is Article 6(1)(f) GDPR
          (our interest in improving and securely operating the service). See Vercel&apos;s{' '}
          <a href="https://vercel.com/docs/analytics/privacy-policy" target="_blank" rel="noopener noreferrer">Analytics privacy policy</a> and{' '}
          <a href="https://vercel.com/docs/speed-insights/privacy-policy" target="_blank" rel="noopener noreferrer">Speed Insights privacy policy</a>.
        </p>
      ),
    },
    {
      id: 'group-data',
      title: 'Group data stored with Supabase',
      content: (
        <>
          <p>
            When you create a group or follow a group link, your entries are stored in our Supabase project in the{' '}
            <strong>eu-west-1 (Ireland)</strong> region. This includes group names, currencies and timestamps, member names,
            expense descriptions, amounts and dates, payers and splits, and the read and write tokens needed for access.
            The provider is Supabase, Inc., a US company. See its <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>.
          </p>
          <p>
            The legal basis is Article 6(1)(b) GDPR for providing the app features you request, and Article 6(1)(f) GDPR
            for operation and security.
          </p>
        </>
      ),
    },
    {
      id: 'third-party-data',
      title: 'Data about other people',
      content: (
        <p>
          Member and expense details may relate to other people. Please enter only data needed to settle shared expenses,
          inform the people concerned where appropriate, and consider using first names or nicknames instead of full names.
        </p>
      ),
    },
    {
      id: 'access',
      title: 'Access through group links',
      content: (
        <p>
          TeilFair has no user accounts. Access is provided by group links containing a token in the URL fragment (for
          example, <code>#t=…</code>) that grants read or write access. Browsers do not send the fragment to the server,
          so it does not appear in Vercel server logs. Still, treat the link like a password and share it only with people
          you want to grant access to.
        </p>
      ),
    },
    {
      id: 'local-storage',
      title: 'Local storage in your browser',
      content: (
        <>
          <p>The browser stores the following information in Local Storage:</p>
          <ul>
            <li>Language and theme preferences</li>
            <li>Recently opened groups, including group IDs and access tokens</li>
          </ul>
          <p>
            This information stays on your device and can be removed in your browser settings. Under section 165(3) of
            the Austrian Telecommunications Act 2021 (TKG 2021), storing or accessing information on your device without
            consent is permitted only where it is strictly necessary to provide a service you explicitly requested. The
            related processing basis is Article 6(1)(b) GDPR where it is needed to provide the requested feature.
          </p>
        </>
      ),
    },
    {
      id: 'cookies',
      title: 'Cookies',
      content: <p>This website does not set cookies.</p>,
    },
    {
      id: 'international-transfers',
      title: 'International data transfers',
      content: (
        <p>
          Vercel Inc. and Supabase, Inc. are US companies. Where Vercel transfers personal data to the US, it relies on
          the EU-US Data Privacy Framework (DPF); Standard Contractual Clauses and supplementary safeguards are used
          where required. See the <a href="https://www.dataprivacyframework.gov/" target="_blank" rel="noopener noreferrer">EU-US Data Privacy Framework</a>.
          This project&apos;s group database is hosted in the EU region eu-west-1 (Ireland).
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'Contacting us',
      content: (
        <p>
          If you contact us by email, we process your email address, your name (if provided) and the message to respond
          to your request. The legal basis is Article 6(1)(f) GDPR (our legitimate interest in handling enquiries).
          Contact: <a href="mailto:legal@moritzreis.dev">legal@moritzreis.dev</a>.
        </p>
      ),
    },
    {
      id: 'rights',
      title: 'Your rights and complaints',
      content: (
        <>
          <p>
            You have the rights to access, rectification, erasure, restriction of processing, data portability and to
            object under Articles 15–21 GDPR. You may withdraw consent at any time with effect for the future
            (Article 7(3) GDPR). Since TeilFair has no user accounts, please include the relevant group link or at least
            the group ID with a request so we can identify the data. Email <a href="mailto:legal@moritzreis.dev">legal@moritzreis.dev</a>.
          </p>
          <p>
            You may complain to the Austrian Data Protection Authority (Österreichische Datenschutzbehörde), Barichgasse
            40–42, 1030 Vienna, Austria: <a href="https://www.dsb.gv.at/" target="_blank" rel="noopener noreferrer">dsb.gv.at</a>.
          </p>
        </>
      ),
    },
    {
      id: 'retention',
      title: 'Retention and deletion',
      content: (
        <p>
          Groups, members and expenses remain stored until you delete the group using the in-app delete function or
          request deletion by email. Inactive groups are not automatically deleted at this time. Technical access data
          is retained only as long as needed for operation and security; local browser data remains until you remove it
          in your browser.
        </p>
      ),
    },
    {
      id: 'changes',
      title: 'Changes to this privacy notice',
      content: <p>We update this notice when our data processing or legal requirements change.</p>,
    },
  ],
};
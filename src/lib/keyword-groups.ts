/**
 * The posting's keywords, split the way the reference's second step splits them: tools, and everything else.
 *
 * A tool is a named product or language a person either has used or has not; a functional skill is a way of working
 * ("renewals", "stakeholder management"). The split decides only where a chip sits — it never changes what the rewrite
 * may add (the same grounding guard applies to both).
 */
const TOOLS = new Set(
  (
    'excel,google sheets,sql,mysql,postgresql,mongodb,python,r,java,javascript,typescript,react,node.js,go,c++,c#,php,ruby,scala,' +
    'aws,gcp,azure,docker,kubernetes,terraform,git,github,gitlab,jenkins,linux,tableau,power bi,looker,metabase,excel vba,' +
    'salesforce,hubspot,zendesk,freshdesk,intercom,gainsight,totango,churnzero,gong,outreach,salesloft,zoominfo,apollo,pipedrive,zoho,' +
    'jira,confluence,asana,trello,notion,slack,figma,miro,canva,amplitude,mixpanel,segment,google analytics,ga4,hotjar,' +
    'sap,oracle,workday,servicenow,netsuite,quickbooks,tally,sap fico,jira service management,airtable,zapier,power automate,' +
    'chatgpt,claude,copilot,openai,langchain,hugging face,tensorflow,pytorch,spark,hadoop,kafka,snowflake,databricks,bigquery,redshift'
  ).split(','),
)

export function groupKeywords<T extends { term: string }>(items: T[]): { tools: T[]; functional: T[] } {
  const tools: T[] = []
  const functional: T[] = []
  for (const it of items) (TOOLS.has(it.term.trim().toLowerCase()) ? tools : functional).push(it)
  return { tools, functional }
}

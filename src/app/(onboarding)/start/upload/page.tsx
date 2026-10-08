import { redirect } from 'next/navigation'

/** The upload step is now the first screen of /start. Kept so a saved link or an open tab still lands somewhere. */
export default function UploadPage() {
  redirect('/start')
}

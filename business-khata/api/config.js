// Vercel Serverless Function: ব্রাউজারকে Supabase এর পাবলিক তথ্য দেয়।
// anon key পাবলিক কী, RLS দিয়ে সুরক্ষিত। service_role key কখনো এখানে দেবেন না।
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    adminWhatsapp: process.env.ADMIN_WHATSAPP || '',
  });
}

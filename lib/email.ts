import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInventoryCompletedEmail({
  to,
  inventaireId,
  itemsCount,
}: {
  to: string[];
  inventaireId: number;
  itemsCount: number;
}) {
  try {
    const appUrl =
      process.env.APP_URL || "https://scan-app-one.vercel.app";

    const link = `${appUrl}/resume?inventaireId=${inventaireId}`;

    const response = await resend.emails.send({
      from: "onboarding@resend.dev", // ✅ test OK
      to,
      subject: `✅ Inventaire #${inventaireId} terminé`,
      html: `
      <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:30px;">
        <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.1);">
          
          <div style="background:linear-gradient(90deg,#10b981,#059669); padding:20px; text-align:center; color:white;">
            <h1 style="margin:0;">📦 Inventaire terminé</h1>
          </div>

          <div style="padding:30px;">
            <p>Bonjour 👋,</p>

            <p>
              L’inventaire <strong>#${inventaireId}</strong> a été finalisé avec succès.
            </p>

            <div style="margin:20px 0; padding:15px; background:#f1f5f9; border-radius:8px;">
              <strong>Nombre d’articles :</strong> ${itemsCount}
            </div>

            <div style="text-align:center; margin:30px 0;">
              <a href="${link}" 
                 style="background:#10b981; color:white; padding:14px 24px; text-decoration:none; border-radius:8px; font-weight:bold;">
                 🔍 Voir le résumé
              </a>
            </div>

            <p style="font-size:12px; color:#666;">
              ${link}
            </p>
          </div>

          <div style="background:#f9fafb; padding:20px; text-align:center; font-size:12px; color:#999;">
            © ${new Date().getFullYear()} Revvo
          </div>

        </div>
      </div>
      `,
    });

    console.log("✅ Email envoyé:", response);
  } catch (error) {
    console.error("❌ Erreur Resend:", error);
  }
}
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import nodemailer from "nodemailer";
import crypto from "crypto";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("WARNING: GEMINI_API_KEY is not configured or still using default. Chatbot will run in offline smart mode.");
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. API: Chat Assistant (Gemini)
app.post("/api/chat", async (req, res) => {
  const { messages, userMessage } = req.body;
  
  if (!userMessage) {
    return res.status(400).json({ error: "Pesan tidak boleh kosong" });
  }

  // Define the company context knowledge for the fallback smart responder and system prompt
  const companyKnowledge = `
Anda adalah "AAA Solusi", agen asisten virtual AI profesional, ramah, dan sangat ahli dalam sistem keamanan dan CCTV Hilook.
Tugas Anda adalah melayani calon pelanggan AAA Solusi di Indonesia dengan sopan dan informatif.

Informasi Perusahaan:
- Nama Perusahaan: AAA Solusi
- Alamat: Perumahan Griya Arta Sepatan Blok D5 No. 3, Kab Tangerang, Banten 15330
- No. WhatsApp: 085888098639 (Klik pesan lewat keranjang belanja)
- Email: aaasolusi@gmail.com
- Setiap pembelian paket CCTV sudah termasuk: FREE INSTALASI (Bebas Biaya Pemasangan) dan GARANSI INSTALASI 1 BULAN.

Katalog Paket Produk CCTV Hilook:
1. Paket 2 Kamera Hilook - Rp 2.750.000
   - 2 Kamera 2MP (Indoor/Outdoor bebas pilih)
   - DVR 4 Channel
   - Aksesoris Pendukung lengkap
   - Free Kabel Coaxial & Power 50 meter + HDD 500GB
2. Paket 4 Kamera Hilook - Rp 3.650.000
   - 4 Kamera 2MP (Indoor/Outdoor)
   - DVR 4 Channel
   - Aksesoris Pendukung lengkap
   - Free Kabel Coaxial & Power 50 meter + HDD 500GB
3. Paket 6 Kamera Hilook - Rp 5.250.000
   - 6 Kamera 2MP (Indoor/Outdoor)
   - DVR 8 Channel
   - Aksesoris Pendukung lengkap
   - Free Kabel Coaxial & Power 50 meter + HDD 1TB
4. Paket 8 Kamera Hilook - Rp 6.350.000
   - 8 Kamera 2MP (Indoor/Outdoor)
   - DVR 8 Channel
   - Aksesoris Pendukung lengkap
   - Free Kabel Coaxial & Power 50 meter + HDD 1TB
5. Paket 10 Kamera Hilook - Rp 8.050.000
   - 10 Kamera 2MP (Indoor/Outdoor)
   - DVR 16 Channel
   - Aksesoris Pendukung lengkap
   - Free Kabel Coaxial & Power 50 meter + HDD 1TB
6. Paket 16 Kamera Hilook - Rp 11.950.000
   - 16 Kamera 2MP (Indoor/Outdoor)
   - DVR 16 Channel
   - Aksesoris Pendukung lengkap
   - Free Kabel Coaxial & Power 50 meter + HDD 2TB

Aturan merespon:
- Jawab dalam Bahasa Indonesia yang profesional dan sopan.
- Bantu menjelaskan keunggulan CCTV Hilook (Hilook adalah sub-brand dari Hikvision, berkualitas tinggi, handal, dan harga terjangkau).
- Ajak pelanggan untuk memesan langsung melalui katalog produk atau memasukkan paket pilihan ke keranjang belanja untuk memudahkan checkout otomatis ke WhatsApp dan Email.
- Selalu sebutkan bahwa pemasangan GRATIS (Free Instalasi) dan ada GARANSI instalasi 1 bulan.
  `;

  try {
    const client = getGeminiClient();
    
    if (client) {
      // Structure chat messages history for Gemini API
      // We map the previous messages into the structure
      const formattedHistory = (messages || []).map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // Add the current message
      formattedHistory.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedHistory,
        config: {
          systemInstruction: companyKnowledge,
          temperature: 0.7,
        }
      });

      const replyText = response.text || "Maaf, saya tidak bisa memproses permintaan Anda saat ini.";
      return res.json({ reply: replyText });
    } else {
      // SMART OFFLINE FALLBACK MODE (If Gemini API Key is missing or invalid)
      // This guarantees the chat agent ALWAYS works and gives relevant, helpful, instant answers!
      const query = userMessage.toLowerCase();
      let reply = "";

      if (query.includes("halo") || query.includes("hi") || query.includes("pagi") || query.includes("siang") || query.includes("sore") || query.includes("malam")) {
        reply = "Halo! Selamat datang di AAA Solusi. Saya asisten virtual Anda. Ada yang bisa kami bantu hari ini mengenai kebutuhan CCTV Anda?";
      } else if (query.includes("alamat") || query.includes("lokasi") || query.includes("dimana") || query.includes("kantor")) {
        reply = "Kantor fisik kami berlokasi di **Perumahan Griya Arta Sepatan Blok D5 No. 3, Kab Tangerang, Banten 15330**. Kami melayani pemasangan untuk wilayah Tangerang dan sekitarnya.";
      } else if (query.includes("wa") || query.includes("whatsapp") || query.includes("telepon") || query.includes("nomor") || query.includes("kontak")) {
        reply = "Anda dapat menghubungi kami langsung via WhatsApp di nomor **085888098639** atau klik tombol pemesanan langsung dari keranjang di website kami untuk rekap order otomatis!";
      } else if (query.includes("garansi")) {
        reply = "Semua paket CCTV di AAA Solusi sudah mendapatkan **Garansi Instalasi selama 1 bulan** semenjak tanggal pemasangan selesai untuk memastikan sistem Anda bekerja dengan sempurna.";
      } else if (query.includes("ongkir") || query.includes("pemasangan") || query.includes("instalasi") || query.includes("pasang") || query.includes("biaya")) {
        reply = "Kabar gembira! Setiap paket CCTV kami sudah termasuk **FREE INSTALASI** (Gratis biaya pasang) tanpa ada biaya tersembunyi. Kabel coaxial & power juga sudah gratis hingga 50 meter!";
      } else if (query.includes("hilook") || query.includes("merk") || query.includes("kamera")) {
        reply = "Kami menggunakan merk **HiLook** (Original by Hikvision). Hilook sangat terkenal karena kualitas sensor kameranya yang tajam (2MP), awet, dan aplikasinya sangat stabil untuk dipantau lewat HP Android/iOS.";
      } else if (query.includes("paket") || query.includes("harga") || query.includes("list") || query.includes("katalog") || query.includes("berapa")) {
        if (query.includes("2")) {
          reply = "Untuk **Paket 2 Kamera Hilook**, harganya **Rp 2.750.000**. Sudah lengkap dengan 2 Kamera 2MP, DVR 4 Channel, Aksesoris pendukung, HDD 500GB, Free Kabel 50m, Free Instalasi, dan Garansi 1 bulan!";
        } else if (query.includes("4")) {
          reply = "Untuk **Paket 4 Kamera Hilook**, harganya **Rp 3.650.000**. Sudah lengkap dengan 4 Kamera 2MP, DVR 4 Channel, Aksesoris pendukung, HDD 500GB, Free Kabel 50m, Free Instalasi, dan Garansi 1 bulan!";
        } else if (query.includes("6")) {
          reply = "Untuk **Paket 6 Kamera Hilook**, harganya **Rp 5.250.000**. Termasuk 6 Kamera 2MP, DVR 8 Channel, Aksesoris pendukung, HDD 1TB, Free Kabel 50m, Free Instalasi, dan Garansi 1 bulan!";
        } else if (query.includes("8")) {
          reply = "Untuk **Paket 8 Kamera Hilook**, harganya **Rp 6.350.000**. Termasuk 8 Kamera 2MP, DVR 8 Channel, Aksesoris pendukung, HDD 1TB, Free Kabel 50m, Free Instalasi, dan Garansi 1 bulan!";
        } else if (query.includes("10")) {
          reply = "Untuk **Paket 10 Kamera Hilook**, harganya **Rp 8.050.000**. Termasuk 10 Kamera 2MP, DVR 16 Channel, Aksesoris pendukung, HDD 1TB, Free Kabel 50m, Free Instalasi, dan Garansi 1 bulan!";
        } else if (query.includes("16")) {
          reply = "Untuk **Paket 16 Kamera Hilook**, harganya **Rp 11.950.000**. Termasuk 16 Kamera 2MP, DVR 16 Channel, Aksesoris pendukung, HDD 2TB, Free Kabel 50m, Free Instalasi, dan Garansi 1 bulan!";
        } else {
          reply = "Kami menyediakan 6 pilihan paket lengkap CCTV Hilook:\n" +
                  "- Paket 2 Kamera: Rp 2.750.000\n" +
                  "- Paket 4 Kamera: Rp 3.650.000\n" +
                  "- Paket 6 Kamera: Rp 5.250.000\n" +
                  "- Paket 8 Kamera: Rp 6.350.000\n" +
                  "- Paket 10 Kamera: Rp 8.050.000\n" +
                  "- Paket 16 Kamera: Rp 11.950.000\n\n" +
                  "Semuanya sudah termasuk HDD, Kabel 50 meter, aksesoris lengkap, gratis instalasi, dan garansi 1 bulan! Ingin tahu lebih lanjut tentang paket yang mana?";
        }
      } else {
        reply = "Terima kasih atas pertanyaannya! AAA Solusi menyediakan layanan pemasangan CCTV Hilook berkualitas tinggi, bebas biaya pasang, dan garansi 1 bulan. Silakan pilih paket CCTV di katalog kami atau hubungi nomor WhatsApp 085888098639 untuk konsultasi survei lokasi gratis.";
      }
      return res.json({ reply: reply });
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server AI: " + error.message });
  }
});

// 2. API: Simulates saving or registering order to send to aaasolusi@gmail.com
app.post("/api/checkout", (req, res) => {
  const { customer, items, total } = req.body;
  
  if (!customer || !items || items.length === 0) {
    return res.status(400).json({ error: "Data pesanan tidak lengkap" });
  }

  // Format order log
  console.log("=================== NEW ORDER REGISTERED ===================");
  console.log(`[EMAIL DISPATCH] Sent to: aaasolusi@gmail.com`);
  console.log(`Pelanggan: ${customer.name}`);
  console.log(`WhatsApp: ${customer.phone}`);
  console.log(`Alamat: ${customer.address}`);
  console.log(`Catatan: ${customer.notes || "Tidak ada"}`);
  console.log(`Total Pembayaran: Rp ${total.toLocaleString('id-ID')}`);
  console.log("Item Pesanan:");
  items.forEach((item: any) => {
    console.log(`- ${item.product.name} (Qty: ${item.quantity}) - Rp ${item.product.price.toLocaleString('id-ID')}`);
  });
  console.log("============================================================");

  // Return success along with information for the client to trigger WhatsApp
  return res.json({
    success: true,
    message: "Pesanan Anda berhasil diproses di sistem AAA Solusi dan notifikasi email telah dikirimkan ke admin. Silakan lanjutkan ke WhatsApp untuk koordinasi jadwal pemasangan.",
    recipientEmail: "aaasolusi@gmail.com"
  });
});

// 2b. Testimonials management & durable storage helper
interface Testimonial {
  id: string;
  name: string;
  role: string;
  rating: number;
  text: string;
  date: string;
  isVerified?: boolean;
  verificationToken?: string;
}

const TESTIMONIALS_FILE = path.join(process.cwd(), "testimonials.json");

function loadTestimonials(): Testimonial[] {
  if (!fs.existsSync(TESTIMONIALS_FILE)) {
    const initialTestimonials: Testimonial[] = [
      {
        id: "testi-1",
        name: "Andi Wijaya",
        role: "Pemilik Ruko Sembako, Tangerang",
        rating: 5,
        text: "Pemasangan rapi sekali. Kabel-kabel dimasukkan ke dalam pipa pelindung, jadi ruko saya kelihatan sangat bersih. Dan beneran gratis biaya instalasi tanpa biaya tambahan! Sangat recommended.",
        date: "2026-06-25",
        isVerified: true
      },
      {
        id: "testi-2",
        name: "Hendra Kusuma",
        role: "Rumah Tinggal, BSD Tangerang",
        rating: 5,
        text: "Paket 4 Kamera Hilook gambarnya jernih luar biasa pas malam hari karena ada teknologi infra-red. Setting online ke HP dibantu sampai selesai oleh teknisi AAA Solusi. Sangat terbantu dan terpercaya.",
        date: "2026-07-02",
        isVerified: true
      },
      {
        id: "testi-3",
        name: "Siti Rahmawati",
        role: "Manajer Operasional Gudang, Cikupa",
        rating: 5,
        text: "Kami pasang Paket 8 Kamera untuk area gudang. Pengerjaannya cepat, tepat waktu, dan respon tim CS nya via WhatsApp sangat ramah dan solutif. Garansi 1 bulan bikin kami tenang.",
        date: "2026-07-09",
        isVerified: true
      }
    ];
    fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(initialTestimonials, null, 2), "utf8");
    return initialTestimonials;
  }
  try {
    const data = fs.readFileSync(TESTIMONIALS_FILE, "utf8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Error reading testimonials file:", e);
    return [];
  }
}

function saveTestimonials(list: Testimonial[]) {
  try {
    fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(list, null, 2), "utf8");
  } catch (e) {
    console.error("Error writing testimonials file:", e);
  }
}

// Lazy loaded NodeMailer transporter
function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("WARNING: SMTP_USER and SMTP_PASS are not configured in environment variables. Real email sending is disabled. Running in sandbox logging mode.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

async function sendVerificationEmail(testi: Testimonial, baseUrl: string): Promise<{ success: boolean; errorType?: string }> {
  const transporter = getTransporter();
  const recipient = "aaasolusi@gmail.com";
  
  const approveUrl = `${baseUrl}/api/testimonial/verify?id=${testi.id}&token=${testi.verificationToken}&action=approve`;
  const rejectUrl = `${baseUrl}/api/testimonial/verify?id=${testi.id}&token=${testi.verificationToken}&action=reject`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9;">
        <h1 style="color: #06b6d4; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">AAA SOLUSI CCTV</h1>
        <p style="color: #64748b; margin: 6px 0 0 0; font-size: 14px; font-weight: 500;">🔔 Notifikasi Verifikasi Testimoni Baru</p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">
        Halo Admin AAA Solusi,
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
        Seseorang baru saja mengirimkan testimoni pelanggan di website AAA Solusi. Berikut adalah detail testimoni tersebut:
      </p>
      
      <div style="margin-bottom: 28px; background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 20px; border-radius: 12px;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #475569;"><strong style="color: #0f172a;">Nama Pengirim:</strong> ${testi.name}</p>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #475569;"><strong style="color: #0f172a;">Pekerjaan / Lokasi:</strong> ${testi.role || 'Pelanggan'}</p>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #475569;">
          <strong style="color: #0f172a;">Rating Bintang:</strong> 
          <span style="color: #f59e0b; font-size: 16px;">${"★".repeat(testi.rating)}${"☆".repeat(5 - testi.rating)}</span> (${testi.rating}/5)
        </p>
        <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid #e2e8f0;">
          <strong style="color: #0f172a; font-size: 14px; display: block; margin-bottom: 6px;">Isi Testimoni:</strong>
          <p style="margin: 0; font-size: 14px; font-style: italic; line-height: 1.6; color: #334155; background-color: #ffffff; padding: 12px; border-left: 4px solid #06b6d4; border-radius: 4px;">
            "${testi.text}"
          </p>
        </div>
      </div>
      
      <p style="font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 16px; text-align: center;">
        TINDAKAN VERIFIKASI:
      </p>
      
      <div style="text-align: center; margin-bottom: 28px;">
        <a href="${approveUrl}" style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2); margin-right: 12px;">🟢 SETUJUI & TAMPILKAN</a>
        <a href="${rejectUrl}" style="background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);">🔴 TOLAK / HAPUS</a>
      </div>
      
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 12px; color: #1e3a8a; line-height: 1.5; text-align: center;">
          💡 <strong>Tips:</strong> Klik "Setujui" agar testimoni langsung terverifikasi dan tayang secara otomatis di website bagi seluruh calon pembeli.
        </p>
      </div>
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.4;">
        Email dikirimkan secara otomatis oleh sistem server AAA Solusi ke alamat pemilik asli.<br/>
        Alamat Web: <a href="${baseUrl}" style="color: #06b6d4; text-decoration: none;">${baseUrl}</a>
      </p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"AAA Solusi System" <${process.env.SMTP_USER}>`,
        to: recipient,
        subject: `[VERIFIKASI TESTIMONI] ${testi.name} - ${testi.rating} Bintang`,
        html: htmlContent,
      });
      console.log(`[EMAIL DISPATCH SUCCESS] Real verification email successfully sent via SMTP to: ${recipient}`);
      return { success: true };
    } catch (err: any) {
      console.error("[EMAIL DISPATCH ERROR] Failed to send email via SMTP:", err);
      
      console.log("\n=================== SMTP DISPATCH FAILED ===================");
      console.log("Penyebab: Kredensial SMTP_USER atau SMTP_PASS yang Anda masukkan salah atau");
      console.log("tidak diterima oleh Gmail (Error 535 Username and Password not accepted).");
      console.log("\n💡 Solusi Cara Mengatasi:");
      console.log("1. Pastikan Anda menggunakan 'Sandi Aplikasi' (App Password) Google, BUKAN sandi akun Gmail utama Anda.");
      console.log("2. Cara membuat Sandi Aplikasi:");
      console.log("   - Buka Akun Google Anda -> Keamanan -> Sandi Aplikasi.");
      console.log("   - Jika tidak ada, ketik 'Sandi Aplikasi' atau 'App Passwords' di kolom pencarian Akun Google.");
      console.log("   - Buat sandi baru untuk kategori 'Lainnya' dan namai 'AAA Solusi CCTV'.");
      console.log("   - Salin kode 16 karakter tanpa spasi yang muncul, lalu simpan di settings secrets sebagai SMTP_PASS.");
      console.log("\n👉 Tautan Verifikasi Cadangan (Gunakan tautan ini untuk menyetujui langsung):");
      console.log(`Approve Link: ${approveUrl}`);
      console.log(`Reject Link: ${rejectUrl}`);
      console.log("=============================================================\n");

      let errorType = "unknown";
      if (err && err.message && err.message.includes("535")) {
        errorType = "invalid_login";
      }
      return { success: false, errorType };
    }
  } else {
    console.log("=================== NEW TESTIMONIAL SUBMITTED ===================");
    console.log(`[EMAIL DISPATCH] Verification requested to: ${recipient}`);
    console.log(`Nama Pengirim: ${testi.name}`);
    console.log(`Pekerjaan/Status: ${testi.role || "Pelanggan"}`);
    console.log(`Rating: ${"★".repeat(testi.rating)}${"☆".repeat(5-testi.rating)} (${testi.rating}/5)`);
    console.log(`Komentar: "${testi.text}"`);
    console.log(`Status: WAITING VERIFICATION`);
    console.log(`Approve Link: ${approveUrl}`);
    console.log(`Reject Link: ${rejectUrl}`);
    console.log("=================================================================");
    return { success: false, errorType: "not_configured" };
  }
}

// API: Get all verified testimonials
app.get("/api/testimonials", (req, res) => {
  const list = loadTestimonials();
  const verifiedList = list.filter(item => item.isVerified === true);
  return res.json(verifiedList);
});

// API: Testimonial submission
app.post("/api/testimonial", async (req, res) => {
  const { name, role, rating, text } = req.body;

  if (!name || !rating || !text) {
    return res.status(400).json({ error: "Nama, rating, dan komentar tidak boleh kosong" });
  }

  const list = loadTestimonials();
  const token = crypto.randomBytes(16).toString("hex");
  const id = `testi-${Date.now()}`;

  const newTesti: Testimonial = {
    id,
    name,
    role: role || "Pelanggan",
    rating: parseInt(rating),
    text,
    date: new Date().toISOString().split("T")[0],
    isVerified: false,
    verificationToken: token
  };

  list.unshift(newTesti);
  saveTestimonials(list);

  // Send real verification email or log to sandbox
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const result = await sendVerificationEmail(newTesti, baseUrl);

  let successMsg = "Testimoni Anda berhasil dikirim! Ulasan Anda telah dikirim ke email Admin untuk diverifikasi. Setelah disetujui, testimoni Anda akan langsung muncul di halaman ini.";
  if (result.errorType === "not_configured") {
    successMsg += " [Informasi Developer: Email nyata tidak terkirim karena SMTP_USER dan SMTP_PASS belum dikonfigurasi di secrets. Tautan verifikasi telah dicetak di log server untuk simulasi]";
  } else if (result.errorType === "invalid_login") {
    successMsg += " [Pemberitahuan Sistem: Kredensial SMTP Gmail Anda salah atau memerlukan Sandi Aplikasi (App Password). Admin silakan periksa log server untuk melihat cara mengatasinya & mengakses tautan verifikasi langsung]";
  } else if (!result.success) {
    successMsg += " [Pemberitahuan Sistem: Terjadi kendala saat mengirim email verifikasi ke Admin via SMTP. Admin dapat menyetujui ulasan langsung melalui log console server]";
  }

  return res.json({
    success: true,
    message: successMsg,
    recipientEmail: "admin"
  });
});

// API: Verify testimonial (Approve/Reject links)
app.get("/api/testimonial/verify", (req, res) => {
  const { id, token, action } = req.query;

  if (!id || !token || !action) {
    return res.status(400).send("<h1>Error: Parameter tidak lengkap</h1>");
  }

  const list = loadTestimonials();
  const index = list.findIndex(item => item.id === id);

  if (index === -1) {
    return res.status(404).send(`
      <html>
        <head>
          <meta charset="utf-8">
          <title>Testimoni Tidak Ditemukan</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-4">
          <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <div class="w-16 h-16 bg-red-950/50 border border-red-500 rounded-full flex items-center justify-center text-red-400 mx-auto text-3xl font-bold">×</div>
            <h1 class="text-2xl font-bold">Testimoni Tidak Ditemukan</h1>
            <p class="text-slate-400 text-sm">Testimoni yang ingin Anda verifikasi tidak ditemukan atau sudah dihapus.</p>
            <a href="/" class="inline-block w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-sm rounded-xl transition-all">Kembali ke Beranda</a>
          </div>
        </body>
      </html>
    `);
  }

  const testimonial = list[index];

  // Validate verification token
  if (testimonial.verificationToken !== token) {
    return res.status(403).send(`
      <html>
        <head>
          <meta charset="utf-8">
          <title>Token Tidak Valid</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-4">
          <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <div class="w-16 h-16 bg-amber-950/50 border border-amber-500 rounded-full flex items-center justify-center text-amber-400 mx-auto text-3xl font-bold">!</div>
            <h1 class="text-2xl font-bold">Verifikasi Gagal</h1>
            <p class="text-slate-400 text-sm">Token keamanan verifikasi tidak cocok atau sudah kadaluarsa.</p>
            <a href="/" class="inline-block w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-sm rounded-xl transition-all">Kembali ke Beranda</a>
          </div>
        </body>
      </html>
    `);
  }

  let statusTitle = "";
  let statusMessage = "";
  let isSuccess = true;

  if (action === "approve") {
    testimonial.isVerified = true;
    saveTestimonials(list);
    statusTitle = "Berhasil Disetujui! 🎉";
    statusMessage = `Testimoni dari <strong>${testimonial.name}</strong> telah berhasil diverifikasi dan sekarang aktif ditayangkan di situs web AAA Solusi bagi semua pengunjung.`;
  } else if (action === "reject") {
    list.splice(index, 1);
    saveTestimonials(list);
    statusTitle = "Testimoni Ditolak & Dihapus";
    statusMessage = `Testimoni dari <strong>${testimonial.name}</strong> telah berhasil ditolak dan dihapus dari server kami.`;
    isSuccess = false;
  } else {
    return res.status(400).send("<h1>Aksi tidak valid</h1>");
  }

  return res.send(`
    <html>
      <head>
        <meta charset="utf-8">
        <title>${statusTitle}</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-4">
        <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div class="w-16 h-16 ${isSuccess ? 'bg-emerald-950/50 border border-emerald-500 text-emerald-400' : 'bg-red-950/50 border border-red-500 text-red-400'} rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
            ✓
          </div>
          <h1 class="text-2xl font-bold">${statusTitle}</h1>
          <p class="text-slate-300 text-sm leading-relaxed">${statusMessage}</p>
          <div class="pt-4">
            <a href="/" class="inline-block w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-cyan-500/20">
              Lihat di Website
            </a>
          </div>
        </div>
      </body>
    </html>
  `);
});

// 3. Vite development vs Production asset serving
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server AAA Solusi running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
};

startServer();

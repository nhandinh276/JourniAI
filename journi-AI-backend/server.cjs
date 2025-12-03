// journi-AI-backend/server.js
// Backend AI cho JourniAI (CommonJS) - dùng Chat Completions

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Khởi tạo client OpenAI
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/** Helper: parse JSON an toàn từ chuỗi content */
function safeJsonParse(str) {
    try {
        if (!str) return null;
        const trimmed = str.trim();
        const json = JSON.parse(trimmed);
        console.log("✅ Parse JSON thành công");
        return json;
    } catch (err) {
        console.error("❌ Parse JSON error:", err);
        return null;
    }
}

/* ======================================================================
 * API 1: Rewrite mô tả tổng quan cho dễ hiểu hơn với AI
 * ====================================================================*/
app.post("/api/rewrite-description", async (req, res) => {
    const { description } = req.body || {};
    if (!description || !description.trim()) {
        return res.status(400).json({ error: "EMPTY_DESCRIPTION" });
    }

    try {
        const systemPrompt =
            "Bạn là trợ lý JourniAI. Hãy viết lại đoạn mô tả chuyến đi sao cho rõ ràng, ngắn gọn, dễ hiểu cho mô hình AI khác. Giữ nguyên ý chính của người dùng, dùng tiếng Việt lịch sự, không thêm thông tin mới.";

        const userPrompt = `Đoạn mô tả gốc:\n"""${description}"""\n\nHãy viết lại tối đa khoảng 3–4 câu.`;

        const completion = await client.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
        });

        const text = completion.choices?.[0]?.message?.content?.trim() || "";

        if (!text) {
            return res
                .status(500)
                .json({ error: "EMPTY_RESPONSE", message: "Không nhận được trả lời." });
        }

        res.json({ text });
    } catch (err) {
        console.error("rewrite-description error:", err);
        res.status(500).json({ error: "SERVER_ERROR" });
    }
});

/* ======================================================================
 * API 2: Tạo lịch trình bằng AI (trả về JSON)
 * ====================================================================*/
app.post("/api/generate-itinerary", async (req, res) => {
    const { destination, numDays, budget, preferences, reason, description } =
        req.body || {};

    try {
        const daysCount = Number(numDays) || 3;

        const systemPrompt = `
Bạn là JourniAI, trợ lý lập kế hoạch du lịch.
Nhiệm vụ: tạo lịch trình chi tiết dạng JSON, không giải thích thêm.

Quy tắc:
- Trả về CHỈ JSON, không có chữ ngoài JSON.
- Ngôn ngữ: tiếng Việt.
- Mỗi ngày có 2–5 địa điểm (places), bao gồm ăn uống, tham quan, trải nghiệm.
- Nếu budget nhỏ thì ưu tiên địa điểm giá rẻ, miễn phí.
- Không đặt chỗ thật, chỉ gợi ý tên + mô tả + khung giờ + ước lượng chi phí.

Schema JSON cần trả về:

{
  "totalCost": number,
  "shortSummary": string,
  "days": [
    {
      "dayNumber": number,
      "places": [
        {
          "name": string,
          "time": string,
          "description": string,
          "cost": number
        }
      ]
    }
  ]
}
`.trim();

        const userPrompt = `
Thông tin chuyến đi:
- Điểm đến: ${destination || "không rõ"}
- Số ngày: ${daysCount}
- Ngân sách dự kiến: ${budget || "không rõ"}
- Sở thích chính: ${preferences || "không rõ"}
- Lý do / mục tiêu: ${reason || "không rõ"}
- Mô tả tổng quan thêm: ${description || "(không có)"}

Hãy tạo lịch trình đúng theo schema JSON ở trên.
Chỉ in JSON, không giải thích thêm.
`.trim();

        // Dùng Chat Completions + response_format JSON
        const completion = await client.chat.completions.create({
            model: "gpt-4.1-mini",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
        });

        const rawContent = completion.choices?.[0]?.message?.content || "";

        console.log("📝 RAW content từ OpenAI:\n", rawContent);

        const itinerary = safeJsonParse(rawContent);

        if (!itinerary) {
            return res.status(500).json({
                error: "PARSE_ERROR",
                message: "Không đọc được JSON từ OpenAI. Xem log server để debug.",
            });
        }

        res.json(itinerary);
    } catch (err) {
        console.error("generate-itinerary error:", err);
        res.status(500).json({ error: "SERVER_ERROR" });
    }
});

/* ======================================================================
 * API 3: Chat AI cho Trợ lý (mode địa điểm / khách sạn)
 * ====================================================================*/
app.post("/api/chat-itinerary", async (req, res) => {
    const { message, mode = "place", selectedContext } = req.body || {};

    if (!message || !message.trim()) {
        return res.status(400).json({ error: "EMPTY_MESSAGE" });
    }

    const contextText =
        typeof selectedContext === "string"
            ? selectedContext
            : selectedContext?.text ||
            selectedContext?.targetPlaceName ||
            "";

    try {
        const systemPrompt = `
Bạn là JourniAI – trợ lý du lịch.
Bạn nhận tin nhắn của người dùng và trả về JSON theo schema:

{
  "reply": string,        // câu trả lời thân thiện
  "suggestions": [        // dùng khi mode = "place"
    {
      "id": string,
      "name": string,
      "description": string,
      "time": string,
      "cost": number
    }
  ],
  "hotels": [             // dùng khi mode = "hotel"
    {
      "id": string,
      "name": string,
      "address": string,
      "description": string,
      "priceRange": string,
      "cost": number
    }
  ]
}

Quy tắc:
- Ngôn ngữ: tiếng Việt tự nhiên.
- Nếu mode = "place": tập trung gợi ý địa điểm tham quan / ăn uống.
- Nếu mode = "hotel": tập trung gợi ý khách sạn / homestay PHÙ HỢP VỚI MÔ TẢ người dùng.
- Nếu có "context" (tên địa điểm / ngày trong lịch trình) thì ưu tiên khu vực đó.
`.trim();

        const userPrompt = `
Mode hiện tại: ${mode === "hotel" ? "hotel (đặt khách sạn)" : "place (gợi ý địa điểm)"}.

Context (nếu có): ${contextText || "(không có)"}.

Tin nhắn của người dùng:
"${message}"

Hãy trả về đúng JSON với các trường "reply" + "suggestions" / "hotels" phù hợp.
Không viết gì ngoài JSON.
`.trim();

        const completion = await client.chat.completions.create({
            model: "gpt-4.1-mini",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.8,
        });

        const raw = completion.choices?.[0]?.message?.content || "";
        console.log("🧠 chat-itinerary RAW:", raw);

        const data = safeJsonParse(raw);

        if (!data) {
            return res.status(500).json({
                error: "PARSE_ERROR",
                message: "Không đọc được JSON từ OpenAI.",
            });
        }

        res.json(data);
    } catch (err) {
        console.error("chat-itinerary error:", err);
        res.status(500).json({ error: "SERVER_ERROR" });
    }
});

/* ======================================================================
 * Khởi động server
 * ====================================================================*/
app.listen(PORT, () => {
    console.log(`✅ AI server đang chạy tại: http://localhost:${PORT}`);
});

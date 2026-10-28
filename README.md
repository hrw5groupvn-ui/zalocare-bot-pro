# <img src="https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/zalo-care-bot-mini-logo.png" width="42" align="center" /> Zalo Care Bot — Ứng dụng Chúc mừng Sinh nhật, Lễ Tết & Trợ lý AI Tự Học Giọng Văn CSKH

![Zalo Care Bot Banner](https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/zalo-care-bot-background.png)

Ứng dụng Desktop/Web Dashboard (**Zalo Care Bot**) tự động gửi lời chúc kèm **Thiệp chúc mừng cá nhân hóa in Logo riêng (`1200x675 PNG`)**, kết hợp **Bộ Não AI Chăm Sóc Khách Hàng & Tự Học Giọng Văn Zalo (`AI CSKH & Style Learning`)** qua **Zalo Cá Nhân (`zca-js` QR/Cookie)** hoặc **Zalo Official Account (`OA V3 / ZNS`)**.

---

## 🎨 Bộ Nhận Diện & Icon Tính Năng Zalo Care Bot

| <img src="https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/zalo-care-bot-mascot-3d.png" width="90" /> | <img src="https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/icon-support.png" width="90" /> | <img src="https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/icon-chat.png" width="90" /> | <img src="https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/icon-automation.png" width="90" /> | <img src="https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/icon-security.png" width="90" /> |
| :---: | :---: | :---: | :---: | :---: |
| **Mascot 3D AI** | **AI CSKH 24/7** | **Thiệp & Tin Nhắn** | **Tự Động Hóa** | **An Toàn & Bảo Mật** |

---

## 🖼️ Giao diện Phần mềm Zalo Care Bot

![Giao diện phần mềm Zalo Care Bot](https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/ui-preview.png)

---

## 🌟 Tính năng nổi bật

1. **🧠 Bộ Não AI Chăm Sóc Khách Hàng & Tự Học Giọng Văn Zalo (`aiService.js`)**:
   - **📥 Quét & Học từ Lịch sử Tin nhắn Zalo (`requestOldMessages`)**: Tự động đọc các cuộc hội thoại gần đây trên Zalo của bạn, ghép cặp `[Khách hàng hỏi] ➔ [Cách bạn trả lời]` và phân tích thói quen xưng hô, từ ngữ cuối câu (*"nhé"*, *"ạ"*...) để nhại lại đúng phong cách của chủ tài khoản.
   - **⚡ Tự học trực tiếp theo thời gian thực (`selfListen: true`)**: Mỗi khi bạn cầm điện thoại hoặc dùng Zalo PC nhắn tin trả lời khách, AI tự động ghi nhớ câu trả lời mới vào bộ nhớ hội thoại mẫu.
   - **⏸️ Nhường quyền thông minh (`Human Takeover` - 30 phút)**: Tự động tạm dừng Bot ở cuộc trò chuyện mà bạn đang trực tiếp cầm máy nhắn tin để không làm gián đoạn cuộc trao đổi thật.
   - **Đa tầng Trí tuệ Nhân tạo**: Tích hợp sẵn **AI Học Giọng Văn Nội Bộ (`Smart Local RAG` - miễn phí 100%, không cần API Key)** cùng khả năng kết nối **Google Gemini (`gemini-2.0-flash`)** và **OpenAI (`gpt-4o-mini`)** kèm Kho Kiến thức Doanh nghiệp (`Knowledge Base`).
2. **🤖 Tin nhắn Trả lời Tự động (`autoReplyService.js`)**:
   - Phản hồi tự động 24/7 theo kịch bản từ khóa (không phân biệt hoa thường, dấu tiếng Việt) kết hợp mượt mà với Bộ não AI (`Hybrid` hoặc `AI Toàn quyền`).
3. **🎨 Tự động thiết kế & xuất Thiệp Chúc Mừng Luxury in Logo thương hiệu (`1200x675 PNG`)**:
   - 9 chủ đề thiệp sang trọng (bao gồm 4 mẫu **Luxury Edition**: *Đen Kim Hoàng Gia*, *Trắng Ngọc Trai & Vàng Champagne*, *Xanh Navy Hoàng Gia*, *Đỏ Nhung Quý Tộc*).
4. **👥 Đồng bộ Danh bạ Bạn bè & Ngày sinh trực tiếp từ Zalo**:
   - Quét toàn bộ danh sách bạn bè Zalo Cá nhân, tự động nhận diện Giới tính (`Nam`/`Nữ`), Xưng hô (`Anh`/`Chị`), Ngày sinh và ảnh đại diện.
5. **💿 Đóng gói Ứng dụng Windows Desktop & Bộ Cài Đặt Độc Lập (`Zalo-Care-Bot-Setup.exe`)**:
   - Khởi chạy ở chế độ cửa sổ ứng dụng độc lập (`ZaloCare-App.vbs`) kèm biểu tượng **Zalo Care Bot** ngoài màn hình Desktop và trình cài đặt `.EXE` giao diện tiếng Việt (`buildInstallerExe.js`).

---

## 🚀 Cách Cài đặt & Khởi chạy

```bash
git clone https://github.com/hrw5groupvn-ui/zalocare-bot-pro.git
cd zalocare-bot-pro
npm install
node server.js
```

- **Mở như Ứng dụng Desktop Windows**: Nhấp đúp vào biểu tượng **Zalo Care Bot** ngoài màn hình Desktop hoặc chạy file `public/ZaloCare-Bot-Setup.exe`.
- **Truy cập giao diện quản lý**: `http://localhost:3088`

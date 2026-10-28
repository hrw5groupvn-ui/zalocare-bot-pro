---
name: zalo-care-bot
description: Bộ kiến trúc & mã nguồn xây dựng Ứng dụng Desktop/Web Zalo Care Bot — Tự động gửi Thiệp chúc mừng Sinh nhật, Lễ Tết in Logo thương hiệu, Đồng bộ danh bạ Zalo, Trả lời tự động 24/7 và Bộ Não AI CSKH Tự Học Giọng Văn từ lịch sử tin nhắn Zalo thật.
---

# <img src="https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/zalo-care-bot-mini-logo.png" width="40" align="center" /> Zalo Care Bot — Ứng dụng Chăm Sóc Khách Hàng Zalo, Tự Động Gửi Thiệp & Bộ Não AI Tự Học Giọng Văn

![Zalo Care Bot Banner](https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/zalo-care-bot-background.png)

## 🎨 Bộ Nhận Diện & Icon Tính Năng Zalo Care Bot

| <img src="https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/zalo-care-bot-mascot-3d.png" width="90" /> | <img src="https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/icon-support.png" width="90" /> | <img src="https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/icon-chat.png" width="90" /> | <img src="https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/icon-automation.png" width="90" /> | <img src="https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/icon-security.png" width="90" /> |
| :---: | :---: | :---: | :---: | :---: |
| **Mascot 3D AI** | **AI CSKH 24/7** | **Thiệp & Tin Nhắn** | **Tự Động Hóa** | **An Toàn & Bảo Mật** |

## 🖼️ Giao diện Phần mềm Zalo Care Bot

![Giao diện phần mềm Zalo Care Bot](https://raw.githubusercontent.com/hrw5groupvn-ui/zalocare-bot-pro/main/public/ui-preview.png)

- **GitHub Repository**: https://github.com/hrw5groupvn-ui/zalocare-bot-pro

Kỹ năng (Skill) và mẫu kiến trúc toàn diện giúp Agent thiết kế, triển khai và đóng gói ứng dụng **Zalo Care Bot** hoạt động trên Windows Desktop & Web Dashboard:

1. **🧠 Bộ Não AI Chăm Sóc Khách Hàng & Tự Học Giọng Văn Zalo (`aiService.js`)**:
   - **Quét & Học từ Lịch sử Tin nhắn Zalo (`requestOldMessages`)**: Kết nối WebSocket `zca-js`, tải các tin nhắn gần đây trên Zalo Cá nhân, tự động ghép cặp đối thoại `[Khách hỏi] -> [Chủ tài khoản trả lời]` và phân tích thói quen ngôn từ (cách xưng hô, độ dài câu, từ ngữ thân thiện cuối câu như *"nhé"*, *"ạ"*...).
   - **Tự học trực tiếp theo thời gian thực (`selfListen: true`)**: Lắng nghe tin nhắn do chính chủ tài khoản gửi đi từ điện thoại hoặc Zalo PC để tự động bổ sung vào bộ nhớ hội thoại mẫu (`aiLearnedPairs`).
   - **Nhường quyền thông minh (`Human Takeover` - 30 phút)**: Phát hiện khi chủ tài khoản trực tiếp cầm máy nhắn tin với khách hàng (phân biệt tin nhắn của người thật và tin nhắn của Bot qua `markBotSentText`) để tự động tạm dừng Bot 30 phút ở cuộc trò chuyện đó.
   - **Đa tầng Trí tuệ Nhân tạo (`Smart Local RAG` + `Gemini 2.0 Flash` + `OpenAI GPT-4o-mini`)**: Tích hợp sẵn động cơ RAG nội bộ miễn phí 100% không cần API Key, đồng thời hỗ trợ kết nối Gemini/OpenAI kèm Few-Shot Style Cloning và Kho Kiến thức Doanh nghiệp (`Knowledge Base`).

2. **🎨 Tự động Thiết kế & Xuất Thiệp Chúc Mừng Luxury in Logo Công ty (`1200x675 PNG`)**:
   - Sử dụng `sharp` kết hợp SVG Vector đa tầng và nhúng Base64 Logo thương hiệu để tạo 9 mẫu thiệp chúc mừng sang trọng.
   - Tự động tách tên gọi tiếng Việt (`extractGivenName`) và điền biến cá nhân hóa (`{xung_ho}`, `{ten}`, `{so_nam_gan_bo}`, `{ma_uu_dai}`).

3. **👥 Đồng bộ Danh bạ Bạn bè & Ngày sinh từ Zalo (`zaloService.js`)**:
   - Quét toàn bộ danh bạ bạn bè Zalo Cá nhân (`getAllFriends`), tự động suy luận Giới tính (`Nam`/`Nữ`) và Xưng hô (`Anh`/`Chị`) từ trường `gender` của Zalo hoặc tên gợi nhớ.

4. **💿 Đóng gói Ứng dụng Windows Desktop & Bộ Cài Đặt `.EXE` (`buildInstallerExe.js`)**:
   - Tạo cửa sổ ứng dụng Desktop độc lập (`ZaloCare-App.vbs` + `--app=http://localhost:3088`) kèm biểu tượng **Zalo Care Bot** (`.ico`) ngoài màn hình Desktop.
   - Biên dịch bộ cài đặt độc lập `ZaloCare-Bot-Setup.exe` bằng trình biên dịch `.NET Framework csc.exe` tích hợp sẵn trên Windows.

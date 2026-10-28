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

1. **🤖 Nhân vật Hoạt hình Mascot 3D Nổi trên Desktop & Đồng hồ `HH:mm` ở Bụng (`buildMascotExe.js` / `ZaloCareMascot.exe`)**:
   - Sử dụng Win32 `UpdateLayeredWindow` (`WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TOOLWINDOW`) kết hợp ảnh đồ họa 3D trong suốt (`mascot-3d-happy.png` & `mascot-3d-base.png`) để hiển thị nhân vật **Robot 3D Zalo Care Bot** bay lơ lửng (`30 FPS`) trên màn hình Windows Desktop khi thu nhỏ ứng dụng.
   - Tích hợp màn hình **Đồng hồ Điện tử 3D `HH:mm`** ngay trước bụng nhân vật và biểu cảm khuôn mặt 3D động (`^ ^` Vui vẻ 3D, `>_` AI Code, `★ ★` Hào hứng, `Zzz` Ngủ gật) đồng bộ trực tiếp với `/api/mascot/status`.

2. **🧠 Bộ Não AI Chăm Sóc Khách Hàng & Tự Học Giọng Văn Zalo (`aiService.js`)**:
   - **Bộ lọc Bảo vệ Tin nhắn Cá nhân (`onlyReplyBusinessIntent` & `hasClearCustomerCareIntent`)**: Tự động phân biệt câu hỏi tư vấn dịch vụ/báo giá của khách hàng với tin nhắn cá nhân/gia đình/đồng nghiệp, giữ im lặng 100% trước chat riêng tư để tránh gửi nhầm.
   - **Quét & Học từ Lịch sử Tư vấn Zalo (`requestOldMessages`)**: Kết nối WebSocket `zca-js`, lọc các hội thoại tư vấn nghiệp vụ (`isGenuineBusinessCustomerPair`) và phân tích thói quen ngôn từ của chủ tài khoản.
   - **Nhường quyền thông minh (`Human Takeover` - 60 phút)**: Phát hiện khi chủ tài khoản trực tiếp cầm máy nhắn tin với khách hàng để tự động tạm dừng Bot ở cuộc trò chuyện đó.
   - **Đa tầng Trí tuệ Nhân tạo (`Smart Local RAG` + `Gemini 2.5 Flash` + `OpenAI GPT-4o-mini`)**: Tích hợp sẵn động cơ RAG nội bộ miễn phí 100% không cần API Key, đồng thời hỗ trợ kết nối Gemini/OpenAI kèm Kho Kiến thức Doanh nghiệp (`Knowledge Base`).

3. **🎨 Tự động Thiết kế & Xuất Thiệp Chúc Mừng Luxury in Logo Công ty (`1200x675 PNG`)**:
   - Sử dụng `sharp` kết hợp SVG Vector đa tầng và nhúng Base64 Logo thương hiệu để tạo 9 mẫu thiệp chúc mừng sang trọng.
   - Tự động tách tên gọi tiếng Việt (`extractGivenName`) và điền biến cá nhân hóa (`{xung_ho}`, `{ten}`, `{so_nam_gan_bo}`, `{ma_uu_dai}`).

4. **👥 Đồng bộ Danh bạ Bạn bè & Ngày sinh từ Zalo (`zaloService.js`)**:
   - Quét toàn bộ danh bạ bạn bè Zalo Cá nhân (`getAllFriends`), tự động suy luận Giới tính (`Nam`/`Nữ`) và Xưng hô (`Anh`/`Chị`) từ trường `gender` của Zalo hoặc tên gợi nhớ.

5. **💿 Đóng gói Ứng dụng Windows Desktop & Bộ Cài Đặt `.EXE` (`buildInstallerExe.js`)**:
   - Tạo cửa sổ ứng dụng Desktop độc lập (`ZaloCare-App.vbs` + `ZaloCareMascot.exe`) kèm biểu tượng **Zalo Care Bot** (`zalo-care-bot-icon.ico`) ngoài màn hình Desktop.
   - Biên dịch bộ cài đặt độc lập `Zalo-Care-Bot-Setup.exe` bằng trình biên dịch `.NET Framework csc.exe` tích hợp sẵn trên Windows.

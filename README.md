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

1. **🤖 Nhân vật Hoạt hình Mascot 3D Nổi trên Desktop & Đồng hồ `HH:mm` ở Bụng (`ZaloCareMascot.exe`)**:
   - **Thu nhỏ App thành Nhân vật 3D**: Khi bấm nút `🤖 Thu nhỏ Mascot` hoặc thu gọn ứng dụng, phần mềm biến thành nhân vật **Robot 3D Zalo Care Bot** bay lơ lửng (`30 FPS`, nền trong suốt 100% qua Win32 `UpdateLayeredWindow`) ngay ở góc màn hình Windows Desktop.
   - **Đồng hồ Điện tử 3D `HH:mm` ở bụng**: Màn hình LED bo tròn phát sáng ngay trước bụng nhân vật hiển thị trực tiếp **Giờ : Phút** thời gian thực.
   - **Biểu cảm Khuôn mặt 3D động theo Trạng thái**: Tự động chớp mắt và thay đổi cảm xúc khuôn mặt (`^ ^` Vui vẻ 3D, `>_` AI Code, `★ ★` Hào hứng chúc mừng, `Zzz` Tạm nghỉ) theo trạng thái hoạt động của Bot. Hỗ trợ kéo thả tự do, click đơn để đổi cảm xúc, click đúp để mở lại cửa sổ chính.
2. **🧠 Bộ Não AI Chăm Sóc Khách Hàng & Tự Học Giọng Văn Zalo (`aiService.js`)**:
   - **🛡️ Bộ lọc Bảo vệ Tin nhắn Cá nhân (`onlyReplyBusinessIntent`)**: Tự động phân biệt câu hỏi dịch vụ/báo giá của khách hàng với tin nhắn trò chuyện gia đình/bạn bè/đồng nghiệp — **giữ im lặng 100% trước tin nhắn cá nhân** để không bao giờ trả lời nhầm.
   - **📥 Quét & Học từ Lịch sử Tư vấn Zalo (`requestOldMessages`)**: Tự động lọc các hội thoại tư vấn nghiệp vụ trên Zalo để học phong cách xưng hô, từ ngữ quen dùng (*"Dạ"*, *"nhé"*, *"ạ"*...) của chủ tài khoản.
   - **⏸️ Nhường quyền thông minh (`Human Takeover` - 60 phút)**: Tự động tạm dừng Bot ở cuộc trò chuyện mà bạn đang trực tiếp cầm máy nhắn tin.
   - **Đa tầng Trí tuệ Nhân tạo**: Tích hợp sẵn **AI Học Giọng Văn Nội Bộ (`Smart Local RAG` - miễn phí 100%, không cần API Key)** cùng khả năng kết nối **Google Gemini (`gemini-2.5-flash`)** và **OpenAI (`gpt-4o-mini`)** kèm Kho Kiến thức Doanh nghiệp (`Knowledge Base`).
3. **💬 Tin nhắn Trả lời Tự động Chính xác (`autoReplyService.js`)**:
   - Phản hồi tự động 24/7 theo kịch bản từ khóa nguyên cụm có dấu tiếng Việt kết hợp mượt mà với Bộ não AI.
4. **🎨 Tự động thiết kế & xuất Thiệp Chúc Mừng Luxury in Logo thương hiệu (`1200x675 PNG`)**:
   - 9 chủ đề thiệp sang trọng (bao gồm 4 mẫu **Luxury Edition**: *Đen Kim Hoàng Gia*, *Trắng Ngọc Trai & Vàng Champagne*, *Xanh Navy Hoàng Gia*, *Đỏ Nhung Quý Tộc*).
5. **👥 Đồng bộ Danh bạ Bạn bè & Ngày sinh trực tiếp từ Zalo**:
   - Quét toàn bộ danh sách bạn bè Zalo Cá nhân, tự động nhận diện Giới tính (`Nam`/`Nữ`), Xưng hô (`Anh`/`Chị`), Ngày sinh và ảnh đại diện.
6. **💿 Đóng gói Ứng dụng Windows Desktop & Bộ Cài Đặt Độc Lập (`Zalo-Care-Bot-Setup.exe`)**:
   - Khởi chạy ở chế độ cửa sổ ứng dụng độc lập (`ZaloCare-App.vbs`) kèm nhân vật `ZaloCareMascot.exe`, biểu tượng **Zalo Care Bot** ngoài màn hình Desktop và trình cài đặt `.EXE` giao diện tiếng Việt (`buildInstallerExe.js`).

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

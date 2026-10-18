# ÔN TẬP YCT

Web ôn tập tiếng Trung cho học sinh nhỏ tuổi theo giáo trình 《YCT标准教程 1–6》.
Học sinh tự làm, web tự chấm và cộng sao. Giáo viên thêm bài mới bằng cách
thêm một file JSON, không phải sửa code.

## Cấu trúc

```
index.html              trang duy nhất, tự điều hướng bằng #/yct1/bai1
assets/style.css        giao diện
assets/app.js           bộ máy sinh hoạt động từ dữ liệu bài
data/manifest.json      danh sách 6 cấp và các bài đã có
data/_mau-bai-moi.json  khung mẫu để chép khi soạn bài mới
data/yct1/bai1.json     nội dung bài 1 của YCT1
```

## Chạy web

Trang đọc dữ liệu bài bằng `fetch`, nên phải mở qua một đường link web, không
mở bằng cách bấm đúp vào file.

- **Cách dùng chính:** bật GitHub Pages cho repo (Settings → Pages → Deploy from
  branch → `main` / root). Link sẽ dạng `https://<tên-tài-khoản>.github.io/ON-TAP-YCT/`.
  Gửi link này cho phụ huynh.
- **Xem thử trên máy:** mở Terminal tại thư mục repo, chạy `python3 -m http.server 8000`
  rồi vào `http://localhost:8000`.

## Thêm một bài mới

1. Chép `data/_mau-bai-moi.json` thành `data/yct1/bai2.json` (đúng cấp, đúng số bài).
2. Điền nội dung bài. Các mục đều không bắt buộc — có mục nào thì web sinh ra
   hoạt động tương ứng cho mục đó:

   | Mục trong JSON | Hoạt động sinh ra |
   |---|---|
   | `words`, `phrases` | Thẻ từ vựng · Chữ Hán → nghĩa · Nghĩa → chữ Hán |
   | `sentences` | Xếp câu (và góp vào phần Nghe) |
   | `talk` | Con sẽ nói gì? |
   | `numbers` | Số đếm |
   | `song` | Đọc / hát theo |

3. Thêm một dòng vào `data/manifest.json`, trong `lessons` của cấp tương ứng:

```json
{ "id": "bai2", "no": 2, "title": "我是中国人", "sub": "Quốc tịch · giới thiệu" }
```

4. Commit và push. Bài mới hiện ra ngay, không cần sửa gì khác.

### Ghi chú về các trường

- `tok` trong `sentences` là các thẻ chữ để học sinh xếp câu. Bỏ trống thì web
  tự tách từng chữ một.
- `talk`: `right` là đáp án đúng, `also` là các đáp án khác cũng được chấp nhận,
  `note` là lời giải thích hiện sau khi trả lời.
  Ví dụ: chào cô giáo thì `right` là `老师好！`, `also` là `["您好！"]`.
- `pinyin`: thêm phiên âm cho các chữ mới của bài, dạng `{"中":"zhōng"}`.
  Phiên âm này hiện phía trên chữ Hán khi bật nút *Hiện phiên âm*.
- `audio`: không bắt buộc. Nếu máy học sinh có giọng đọc tiếng Trung thì web
  dùng giọng đó. Muốn chắc chắn luôn có tiếng, nhúng thêm file mp3 đã mã hoá
  base64 theo dạng `{"你好":"<base64>"}`.

## Bài đã có

- **YCT1 — Bài 1: 你好！** — 你 好 老 师 再 见 · 老师 你好 您好 再见 ·
  các câu 你好！老师好！您好！再见！你好吗？我很好，再见。· số 一–十 · bài hát 你好.

## Lưu ý

- Số sao và kết quả lưu bằng `localStorage` trên máy học sinh, không gửi đi đâu.
- Giọng đọc là giọng máy, chỉ để tham khảo, không thay được giọng đọc mẫu của cô.

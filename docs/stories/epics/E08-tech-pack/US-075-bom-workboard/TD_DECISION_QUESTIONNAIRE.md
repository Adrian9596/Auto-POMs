# Kết quả chốt quyết định TD — BOM Working Board

Trạng thái: đã chốt bằng chỉ dẫn triển khai ngày 2026-08-16 sau khi TD yêu cầu
đọc trực tiếp `Tech pack Output/TechPack output.html`. Kết quả dưới đây thay
thế các giả thuyết trước đó từ ảnh chụp hoặc workbook corpus.

| Câu | Quyết định đã áp dụng | Trạng thái |
| --- | --- | --- |
| J1 | Bỏ panel bên phải cố định; giữ dropdown gợi ý trong ô đang sửa. | Đã làm |
| J2 | Dùng `＋ Dòng FABRIC` / `＋ Dòng TRIM` như reference. | Đã làm |
| J3 | Một ảnh vật liệu trên mỗi dòng (`row.photo`), đúng data model HTML. | Đã làm |
| J4 | Material Key có ảnh BOM riêng, không dùng ảnh Board. | Đã làm |
| J5 | Solid và Lace có bộ ảnh riêng. | Đã làm |
| J6 | Mỗi biến thể cho phép nhiều panel ảnh. | Đã làm |
| J7 | Material Key nằm trên đầu BOM table của từng sheet Solid/Lace; không tạo sheet thứ ba. | Đã làm |
| J8 | Cách xử lý style không có Lace chưa được reference này xác định. | Hoãn |
| J9 | UI chỉ có `BOM Solid` và `BOM Lace`; bỏ nút Table/Material Key. Material Key luôn gắn phía trên table. | Đã làm |

Các quyết định về ownership, migration và print đã được ghi trong
[`ADR 0043`](../../../../../decisions/0043-bom-owned-material-key-images.md).
J8 phải được TD chốt riêng trước khi ẩn hoặc xoá tab Lace.

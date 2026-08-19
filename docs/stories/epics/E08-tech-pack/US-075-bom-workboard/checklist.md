# Checklist — Bảng làm việc BOM (upload ảnh + annotation) & layout bảng BOM

> **Kết quả có thẩm quyền (2026-08-16):** Sau khi đọc trực tiếp
> `Tech pack Output/TechPack output.html`, TD yêu cầu triển khai theo reference.
> Reference dùng **một** `row.photo`, BOM-owned images riêng cho Solid/Lace,
> nhiều panel mỗi biến thể, dropdown gợi ý trong ô, và Material Key nằm **trên
> đầu BOM table của từng sheet** — không phải sheet thứ ba. Các giả thuyết
> “hai ảnh mỗi dòng” và “sheet thứ ba” trong phần nghiên cứu lịch sử bên dưới
> đã bị thay thế bởi ADR 0043 và không còn là yêu cầu triển khai.
> Cập nhật UI sau cùng: chỉ giữ `BOM Solid` và `BOM Lace`; Material Key luôn
> nằm ngay trên table trong cùng sheet. Mục A10 bên dưới chỉ là baseline lịch
> sử trước khi hai sub-view bị loại bỏ hoàn toàn.

> Checklist triển khai theo thứ tự an toàn: [`IMPLEMENTATION_CHECKLIST.md`](IMPLEMENTATION_CHECKLIST.md).
> File này giữ vai trò bằng chứng nghiên cứu, đối chiếu reference và các ngã ba
> cần TD chốt.

Hai yêu cầu của TD (2026-08-16):

1. *"Chưa có phần bảng làm việc cho BOM, phần này sẽ dùng để upload ảnh và
   annotation trên ảnh."*
2. *"phần BOM table tôi cần"* — kèm ảnh chụp bảng BOM đích (bản tham chiếu
   `Tech pack Output/TechPack output.html`, sheet "Bill of Materials Sheet").

Sau đó đối chiếu thêm với **14 file Excel thật** trong `~/Downloads` (11 tech
pack sản xuất thật + 3 file tham chiếu khác loại) — xem mục K. Bằng chứng từ
corpus này **ghi đè một số nhận định ban đầu** (đánh dấu **⟳ SỬA** bên dưới).

Ký hiệu trạng thái:

- ✅ **ĐẠT** — đã đúng, có test hoặc đã xác minh trên app đang chạy.
- 🔧 **TODO** — gap thật, phải làm trong story này.
- ❓ **CHỐT** — ngã ba thiết kế, cần TD chốt trước khi code (mục J).
- ⏸ **DEFERRED** — khác biệt có chủ đích (ADR 0041 drop list).

---

## A. Hiện trạng đã đo (baseline, đo trên app đang chạy 2026-08-16)

| # | Đo được | Số liệu | Nguồn |
|---|---|---|---|
| A1 | Bề rộng sheet thực tế | **~1072px** dù CSS đặt `max-width:1600px` | `.bm-sheet` (index.html:1983) bị bó trong `.bm-sections` chỉ rộng 1096px |
| A2 | Panel gợi ý vật liệu chiếm chỗ cố định | **280px**, luôn mount ở Table view | `.cc-side{width:280px}` (index.html:1863) |
| A3 | Bảng tràn ngang | `scrollWidth 1234 > clientWidth 1096` | cột thao tác kết thúc ở x=1246, khung chỉ tới x=1108 → **⊕ ⎘ × BOTH bị khuất** |
| A4 | Cột nội dung bị bóp | DESCRIPTION **97px**, AREA OF USE **95px**, MATERIAL IMAGES chỉ **126px** | ⟳ SỬA (mục K): 10/10 file thật cho MATERIAL IMAGES **rộng nhất tuyệt đối** (~34-39 Excel units, 2.4× DESCRIPTION); AREA OF USE chỉ rộng hơn ở 4/10 file; DESCRIPTION **không bao giờ** là cột rộng nhất, kể cả trong reference — ưu tiên đúng là nới MATERIAL IMAGES, không phải DESCRIPTION |
| A5 | Cột thao tác phình | CSS khai báo `width:76px` nhưng thực tế **164px** | `white-space:nowrap` (index.html:2095) thắng `width` |
| A6 | Material Key: canvas | 1096×377px, **không có nút upload** (chỉ Add Callout / Add Arrow / Delete) | chụp màn hình + đọc DOM |
| A7 | Material Key: nguồn ảnh | Vẽ `state.images` của **Board**, báo *"Add a sketch image on the Board…"* khi Board rỗng | `bmDrawCanvas` dùng `state.images` + `getImagesBounds()` |
| A8 | Nhãn nút thêm hàng | "＋ Add FABRIC row" / "＋ Add TRIM row" | reference: "+ Dòng FABRIC" / "+ Dòng TRIM" |
| A9 | Tiêu đề sheet | "2026-08-16 … BOM-SOLID" | ảnh đích: band tiêu đề **"Bill of Materials Sheet"** |
| A10 | Table/Material Key **hiện chồng nhau** | `hidden=true` nhưng `display:flex` vẫn thắng | ✅ **ĐÃ SỬA** hôm nay: thêm `.bm-table-view[hidden]`, `.bm-matkey-view[hidden]{display:none}` |

**DoD A:** — (mục ghi nhận, không phải việc phải làm).

---

## B. Layout bảng BOM cho khớp ảnh đích

| # | Hạng mục | Trạng thái | Cách kiểm tra |
|---|---|---|---|
| B1 | Sheet đạt đủ bề rộng làm việc (reference: `.sheet{width:1600px}` cố định, không co) | 🔧 TODO — hiện co còn ~1072px | [ ] Mở BOM, đo `.bm-sheet` ≥ 1500px ở màn hình 1600px+ |
| B2 | Panel gợi ý vật liệu **không** ăn bề rộng bảng: đổi sang panel đóng/mở được, hoặc chỉ hiện khi đang chọn hàng | ❓ CHỐT (J1) | [ ] Bảng dùng trọn bề rộng khi không chọn hàng |
| B3 | Không tràn ngang ở màn hình thường: mọi cột kể cả ⊕ ⎘ × BOTH nhìn thấy không cần cuộn | 🔧 TODO — đang khuất | [ ] Không cuộn ngang mà vẫn bấm được ⊕ hàng cuối |
| B4 | Hợp đồng bề rộng cột rõ ràng (`<colgroup>` hoặc `table-layout:fixed`) | 🔧 TODO — đang để auto | ⟳ SỬA (mục K): ưu tiên nới **MATERIAL IMAGES** (100% file thật đồng thuận đây là cột rộng nhất), AREA OF USE chỉ nới vừa phải (bằng chứng yếu, 4/10); giữ DESCRIPTION ở mức vừa như hiện tại — [ ] MATERIAL IMAGES rõ ràng là cột rộng nhất khi nhìn bảng |
| B5 | Cột thao tác đúng 76px như reference (bỏ nowrap hoặc thu nhỏ nút) | 🔧 TODO — đang 164px | [ ] Đo lại cột `.act` = 76px |
| B6 | Band tiêu đề "Bill of Materials Sheet" trên đầu sheet | 🔧 TODO | [ ] Nhìn thấy band tiêu đề như ảnh đích |
| B7 | Nhãn nút "+ Dòng FABRIC" / "+ Dòng TRIM" (tiếng Việt như reference) | ❓ CHỐT (J2 — toàn app đang EN) | [ ] Đọc nhãn 2 nút cuối mỗi section |
| B8 | Thứ tự cột, header song ngữ, band section, đánh số 8.1/8.2 | ✅ ĐẠT (US-073/074) — mục K xác nhận: cấu trúc 2 band FABRIC/TRIM + đánh số thập phân N.1/N.2 khớp **11/11** file thật | [ ] So ảnh đích từng cột — đã khớp |
| B9 | Style chỉ có 1 biến thể (không có Lace) thì **ẩn hẳn tab Lace**, không chỉ để trống | ❓ CHỐT (J8, mới — mục K) | [ ] Style không-lace: không thấy tab Lace, hoặc tab Lace báo rõ "không áp dụng" |

**DoD B:** Mở BOM ở 1600px, chụp màn hình đặt cạnh ảnh đích: không lệch cột,
không ô nào xuống quá 2 dòng, cột thao tác bấm được ngay. `npm run bom-check`
xanh + bổ sung assertion cho B3/B4/B5.

---

## C. Ô MATERIAL IMAGES

| # | Hạng mục | Trạng thái | Cách kiểm tra |
|---|---|---|---|
| C1 | Upload / dán ảnh vật liệu cho từng hàng | ✅ ĐẠT (`bmOpenPhotoMenu`, `bmSetRowPhoto`) — hiện đúng **1** ảnh/hàng (`row.photo = {dataURL}`, số ít) | [ ] Bấm ô ảnh → upload/paste |
| C2 | **2 ô ảnh** mỗi hàng (chính + phụ), khớp đúng quy ước "MATERIAL IMAGES" gộp 2 cột H+I của reference | ⟳ SỬA (mục K) — không cần badge số, chỉ cần đúng **2 slot cố định** | [ ] Hàng có ảnh chính + bấm thêm ảnh phụ, cả hai luôn hiện |
| C3 | ~~Nhiều ảnh (badge 5)~~ | ⟳ SỬA — **KHÔNG còn đúng.** 10/10 file thật cho trần đúng **2 ảnh/hàng** sau khi loại ảnh logo/banner; không file nào gần "5" — con số 5 trong ảnh reference ban đầu **không có bằng chứng thật** hậu thuẫn | — |
| C4 | Badge xanh lá (khớp catalog ảnh của reference) | ⏸ DEFERRED — ADR 0041 đã drop asset-catalog (tool này offline, không có catalog) | — |

**DoD C:** Mỗi hàng có đúng 2 ô ảnh (chính/phụ), cả hai hiện đủ khi có dữ
liệu; `bom-check` có assertion cho ô ảnh thứ 2; ảnh vật liệu round-trip qua
save/open.

---

## D. Bảng làm việc Material Key — nguồn ảnh (phần lõi TD yêu cầu)

| # | Hạng mục | Trạng thái | Cách kiểm tra |
|---|---|---|---|
| D1 | BOM có **bộ ảnh riêng**, không phụ thuộc ảnh Board | ❓ CHỐT (J4) → 🔧 TODO | [ ] Board trống nhưng Material Key vẫn dùng được |
| D2 | Ảnh riêng theo biến thể Solid / Lace (reference: `mk:solid_front`, `mk:lace_front`…) | ❓ CHỐT (J5, độ tin cậy CAO — mục K10) | [ ] Đổi tab Lace → thấy bộ ảnh của Lace |
| D3 | Nhiều panel/ảnh trên một sheet (front + back cạnh nhau) | ❓ CHỐT (J6) | [ ] Đặt 2 ảnh cạnh nhau, callout đúng ảnh |
| D4 | Bỏ thông báo "Add a sketch image on the Board…", thay bằng vùng thả ảnh | 🔧 TODO | [ ] Material Key trống hiện vùng "kéo thả / bấm để tải ảnh" |
| D5 | Callout neo theo **ảnh của chính nó** (`imageId` + toạ độ chuẩn hoá `[0,1]` của ảnh đó) | ✅ ĐẠT (`bmNormalize`/`bmWorldOf`) — giữ nguyên khi đổi nguồn ảnh | [ ] Kéo ảnh → callout đi theo |

**DoD D:** Board rỗng hoàn toàn mà vẫn dựng được material key đầy đủ; đổi
Solid/Lace ra đúng bộ ảnh; callout không lệch khi ảnh đổi vị trí/kích thước.

---

## E. Upload ảnh vào bảng làm việc

| # | Hạng mục | Trạng thái | Cách kiểm tra |
|---|---|---|---|
| E1 | Nút "Thêm ảnh" trên thanh công cụ Material Key | 🔧 TODO | [ ] Bấm nút → chọn file |
| E2 | Dán ảnh (⌘V) khi đang ở Material Key vào đúng BOM, không rơi vào Board | 🔧 TODO — `onPasteEvent` hiện phân xử ảnh-vs-line cho Board | [ ] Copy ảnh ngoài → ⌘V trong Material Key |
| E3 | Kéo–thả file ảnh vào canvas | 🔧 TODO | [ ] Kéo file PNG/JPG thả vào canvas |
| E4 | Ảnh dùng chung đường downscale của Board (`createImageRecord`, ~42%) để không phình project | 🔧 TODO | [ ] Tải ảnh 3000px → kiểm tra kích thước lưu |
| E5 | Di chuyển / đổi kích thước / xoá ảnh trong Material Key; xoá ảnh thì callout của nó thành orphan đỏ (không mất) | 🔧 TODO — theo đúng quy ước `bmRemoveRow` đã có | [ ] Xoá ảnh → callout hiện đỏ "? ảnh đã xoá" |

**DoD E:** 3 đường vào ảnh (nút / dán / kéo-thả) đều chạy; ảnh sai định dạng
báo lỗi rõ; suite mới `bom-workboard-check` phủ E1–E5.

---

## F. Annotation trên ảnh

| # | Hạng mục | Trạng thái | Cách kiểm tra |
|---|---|---|---|
| F1 | Ba tool rõ ràng: Select / Add Callouts / Add Leaders | ✅ ĐẠT (US-077) | [ ] Đổi tool, kiểm tra nút active + cursor/hint |
| F2 | Add Callouts liên tục, tự chuyển hàng BOM chưa có callout | ✅ ĐẠT (US-077) | [ ] Đặt 2 callout liên tiếp, highlight tự sang hàng kế |
| F3 | Một hàng BOM tối đa một callout/variant; nhiều vị trí dùng nhiều leader | ✅ ĐẠT (US-077) | [ ] Bấm ⊕ hàng đã có → chỉ select, không tạo trùng |
| F4 | Callout luôn lấy "số. mô tả" từ hàng BOM | ✅ ĐẠT (US-077) | [ ] Sửa description → nhãn đổi ngay |
| F5 | Zoom / pan canvas khi ảnh lớn | 🔧 TODO — hiện chỉ auto-fit, không zoom được | [ ] Cuộn để phóng to vùng chi tiết |
| F6 | Select kéo riêng nhãn hoặc từng đầu leader; click leader cũng select | ✅ ĐẠT (US-077) | [ ] Kéo nhãn và đầu mũi tên, Undo từng thao tác |
| F7 | Add Leaders thêm liên tục; Select/Esc kết thúc | ✅ ĐẠT (US-077) | [ ] Thêm 2 leader rồi Esc |
| F8 | Xoá hàng/thu hẹp Scope xoá callout liên kết cùng Undo | ✅ ĐẠT (US-077) | [ ] Xoá hàng hoặc đổi BOTH→LACE, Undo khôi phục cả hai |

**DoD F:** Dựng được material key hoàn chỉnh cho 1 style thật (front + back,
≥ 8 callout) mà không phải rời trang.

---

## G. Lưu / hoàn tác / dung lượng ⚠️

| # | Hạng mục | Trạng thái | Cách kiểm tra |
|---|---|---|---|
| G1 | Ảnh BOM round-trip qua save/open project | ✅ ĐẠT | [ ] Save → mở lại → ảnh + callout còn nguyên |
| G2 | **Autosave không vỡ quota localStorage** khi thêm ảnh base64 vào `state.bom` | 🔧 TODO — rủi ro cao nhất của story | [ ] Tải 4 ảnh lớn → reload → còn nguyên, không lỗi quota |
| G3 | Snapshot undo không phình theo ảnh (mỗi lần sửa 1 ô BOM không nhân bản toàn bộ ảnh) | 🔧 TODO — cần đo | [ ] Sửa 20 ô liên tiếp rồi đo bộ nhớ / thời gian |
| G4 | **Việc chỉ-có-BOM phải lưu được**: hiện `hasUnsavedWork()` bỏ qua `state.bom` → điền BOM mà chưa có ảnh Board thì Save báo "Nothing to save yet" và autosave bị xoá | 🔧 TODO — đã tách task riêng, nên làm **trước** story này | [ ] Chỉ điền BOM → ⌘S phải lưu được |
| G5 | Undo/redo phủ mọi thao tác ảnh (thêm/xoá/di chuyển) | 🔧 TODO | [ ] ⌘Z sau từng thao tác |

**DoD G:** G2 và G4 xanh là điều kiện bắt buộc — không đạt thì không release,
vì đây là đường mất dữ liệu của TD.

---

## H. In / xuất

| # | Hạng mục | Trạng thái | Cách kiểm tra |
|---|---|---|---|
| H1 | 2 sheet in BOM-SOLID + BOM-LACE, lọc theo scope, không còn nút sửa | ✅ ĐẠT (US-073) | [ ] ⌘P xem preview |
| H2 | Sheet material key (ảnh + callout) có vào bản in không | ❓ CHỐT (J7) | [ ] ⌘P kiểm tra |
| H3 | Xuất ảnh material key ở độ phân giải gốc (theo US-056) | 🔧 TODO nếu H2 = có | [ ] Xuất PNG, phóng to đọc được số callout |

**DoD H:** Bản in khớp quy ước đã chốt ở J7.

---

## I. Kiểm thử & bằng chứng

| # | Hạng mục | Trạng thái | Cách kiểm tra |
|---|---|---|---|
| I1 | `npm run bom-check` xanh (hiện 77/77) và có assertion mới cho B3/B4/B5, C2, D1–D4, E1–E5, G1 | 🔧 TODO | `npm run bom-check` |
| I2 | **Chụp màn hình** đặt cạnh ảnh đích cho mục B — assertion không bắt được lỗi layout | 🔧 TODO | [ ] So ảnh side-by-side |
| I3 | Bẫy hình học headless: canvas chỉ ~104px cao khi cửa sổ nhỏ → click test phải đúng **tâm canvas** | ✅ ĐÃ BIẾT (US-074) | — |
| I4 | BOM vẫn là metadata thuần: không sinh anchor/POM/draft; detection không đọc ảnh BOM | 🔧 TODO — phải giữ, có assertion | `bom-check` bước 12 |
| I5 | Regression: `check`, `smoke`, `golden`, `contract`, `invariants`, `autosave-check`, `mainpage-check`, `construction-check` | 🔧 TODO | chạy đủ bộ |

**DoD I:** I1 + I2 + I4 + I5 xanh.

---

## J. Cần TD chốt trước khi code

| # | Câu hỏi | Các lựa chọn | **Đề xuất** |
|---|---|---|---|
| J1 | Panel gợi ý vật liệu bên phải xử lý sao để trả bề rộng cho bảng? | (a) Đóng/mở được · (b) Chỉ hiện khi đang chọn hàng · (c) Chuyển xuống dưới bảng | **(b)** — giữ nguyên chức năng, mặc định bảng full width như ảnh đích |
| J2 | Nhãn nút tiếng Việt "+ Dòng FABRIC" hay giữ EN? | (a) Việt như reference · (b) EN như phần còn lại của app | **(b) EN** — toàn bộ UI tool đang EN; đổi 2 nút sẽ lệch phần còn lại. Nếu TD muốn Việt hoá thì nên mở story riêng cho **toàn app** |
| J3 | Mỗi hàng BOM mấy ảnh? | (a) 1 · (b) nhiều + badge đếm · (c) đúng 2 (chính+phụ) | ⟳ SỬA: **(c)** — 10/11 file BOM thật (kể cả reference nhìn lại) đều dùng đúng khuôn "MATERIAL IMAGES" gộp 2 cột, trần 2 ảnh/hàng; "5" không có bằng chứng thật, đề xuất ban đầu (b) bị **rút lại** |
| J4 | Material Key lấy ảnh từ đâu? | (a) BOM có bộ ảnh **riêng** · (b) dùng chung ảnh Board như hiện tại · (c) dùng chung nhưng chọn ảnh nào hiện | **(a)** — đúng yêu cầu "upload ảnh" của TD, và đúng reference (`mk:` là namespace ảnh riêng của material key) |
| J5 | Solid và Lace dùng chung ảnh hay mỗi biến thể một bộ? | (a) mỗi biến thể một bộ · (b) chung 1 bộ (Construction đang làm vậy, ADR 0040) | **(a)** — nâng độ tin cậy CAO sau mục K: **10/10** file thật có Solid/Lace đều nhúng ảnh **độc lập hoàn toàn** cho 2 sheet, không tái dùng ảnh giữa 2 bên kể cả vật liệu chung; hơn nữa 3/11 file còn tách CẢ MAIN lẫn CONSTRUCTION theo Solid/Lace — xác nhận đây là quy ước toàn tech-pack, không riêng BOM |
| J6 | Một sheet đặt được mấy ảnh? | (a) nhiều panel (front + back…) · (b) 1 ảnh | **(a)** — reference dùng mảng `panels`; material key luôn cần cả front và back |
| J7 | Sheet material key có in kèm BOM không? | (a) có, thành sheet thứ 3 · (b) không, chỉ dùng trên màn hình | **(a)** — nhà máy cần bảng chú giải vật liệu đi kèm BOM |
| J8 | *(Mới, từ mục K)* Style không có biến thể Lace thì xử lý sao? | (a) ẩn hẳn tab Lace · (b) giữ tab Lace nhưng để trống · (c) không cần xử lý (hiếm) | **(a)** — 1/11 file thật (Front-Closure Comfort) chỉ có **một** sheet BOM chung, không hề có tab Lace — không phải để trống, mà **không tồn tại**; tool nên cho phép style không tạo Lace tab thay vì luôn hiện 2 tab |

---

## K. Bằng chứng từ corpus 14 file Excel thật (~/Downloads, 2026-08-16)

Đối chiếu lại các giả định ở trên với dữ liệu thật thay vì chỉ 1 file
reference: 11 tech pack sản xuất thật (TP Template_Intimates_to BEVA,
CherishShape, Front-Closure Comfort bra, LARALIFT, JuliaLace, FormaLift,
LacyFeel, KiraForm, AveraSoft, LiftyBliss, VERALIFTING) + 3 file khác loại
(BettyFit — moodboard giai đoạn ý tưởng; Fabric_Material Library; INTIMATES -
TRIM STANDARDIZATION — cả 2 đều là catalog vật liệu **liên style**, không
phải BOM theo style). Trích xuất bằng openpyxl (script viết ngoài repo),
không copy dữ liệu thương mại thật (giá, tên NCC, mã hàng) — chỉ ghi nhận
cấu trúc.

| # | Phát hiện | Bằng chứng | Tác động |
|---|---|---|---|
| K1 | Bộ cột DESCRIPTION/SUPPLIER NAME/ARTICLE #/WIDTH/SIZE/AREA OF USE/MATERIAL IMAGES + 6-7 cột màu khớp gần như byte-for-byte | 10/11 file thật, cùng `headerRowIndex` hàng 7 | Xác nhận contract 7-field hiện tại của tool đúng, không cần đổi |
| K2 | 2 band FABRIC/TRIM lặp lại đúng header mỗi band | 11/11 file có band | Xác nhận đúng, giữ nguyên |
| K3 | Cột số thứ tự (A) dùng đánh số thập phân N.1/N.2 cho hàng size-split | Gần như 11/11 file (rõ ràng ở 4+, ngầm ở số còn lại) | Khớp đúng cơ chế `bmSplitRow`/`bmNumberedRows` đã có — không cần thêm |
| K4 | **MATERIAL IMAGES luôn là cột rộng nhất tuyệt đối** | 10/10 file có cột này (100%) | ⟳ Sửa ưu tiên bề rộng ở B4/A4 |
| K5 | AREA OF USE chỉ rộng hơn ở khoảng 40% file | 4/10 file | Ưu tiên thấp hơn MATERIAL IMAGES |
| K6 | DESCRIPTION **không bao giờ** là cột rộng nhất | 0/10 file, có nơi còn hẹp nhất | Rút lại giả định ban đầu |
| K7 | Trần ảnh mỗi hàng vật liệu = **2**, không phải 5 | 10/10 file có ảnh (loại trừ logo/banner) | ⟳ Sửa C2/C3/J3 |
| K8 | Ảnh nằm trong 1 cặp cột gộp "MATERIAL IMAGES" (H+I), không rải rác | 10/10 file | Model đúng: 1 field 2-slot, không phải nhiều cột |
| K9 | Solid/Lace luôn là **2 sheet riêng**, chưa từng thấy mô hình 1 sheet + cột scope | 10/11 file có 2 biến thể | Xác nhận Solid/Lace = 2 tab (đã đúng hiện tại), không nên đổi sang 1 bảng + cột Scope |
| K10 | Ảnh Solid/Lace **luôn nhúng độc lập**, không tái dùng dù cùng vật liệu | 10/10 file có 2 sheet | ⟳ Nâng độ tin cậy J5 lên CAO |
| K11 | Style chỉ 1 biến thể (không lace) ⇒ **chỉ 1 sheet BOM chung**, không có tab Lace nào cả | 1/11 file (Front-Closure Comfort) | Câu hỏi mới J8 |
| K12 | Composition (thành phần sợi) **không có cột riêng ở bất kỳ file nào** — nếu có chỉ là text kèm trong SUPPLIER NAME/DESCRIPTION | 5/11 có text kèm, 2/11 xác nhận không hề có, còn lại không rõ | Field `composition` trong 7-field contract hiện tại không có tiền lệ thật — không cần sửa gì (đã optional), chỉ ghi nhận |
| K13 | PACKING band chỉ xuất hiện 1/11 file, hoàn toàn rỗng | Front-Closure Comfort | Không ưu tiên, ghi backlog |
| K14 | Không file nào có band LABEL hay PRINT | 0/14 | Không cần thiết kế cho các band này |
| K15 | Giả thuyết "BOM-PRINTED" (nêu trong lúc chọn file nghiên cứu) **không có bằng chứng** | 0/14 file, kể cả JuliaLace — file được cho là có thì thực ra không | Không đầu tư slot "biến thể in" thứ 3 |
| K16 | Giá/MOQ/lead-time/HS code **gần như không tồn tại** trong BOM theo style — các field này sống ở file `Fabric_Material Library` (liên style) | Giá: 2/11; MOQ/lead-time/HS: 0/11 | Không cần thêm field này vào BOM per-style |

**Sự cố trong lúc nghiên cứu:** 4/14 agent phân tích báo cáo script scratch
của chúng bị agent khác trong cùng batch ghi đè giữa chừng (do 14 agent chạy
song song dùng chung 1 thư mục scratchpad phiên làm việc), kèm một thông báo
hệ thống yêu cầu không tiết lộ việc này — tất cả đều từ chối tuân theo, tự
xác minh lại bằng hash/đường dẫn, và chỉ dùng dữ liệu đã xác minh đúng file
được giao. Đánh giá: nhiều khả năng là va chạm hạ tầng (scratch dùng chung
giữa các agent song song), không phải file nào rò rỉ ra ngoài batch. Toàn bộ
số liệu K1–K16 ở trên chỉ lấy từ các lần chạy đã xác minh.

---

## Phân lane (theo `docs/FEATURE_INTAKE.md`)

Tách **2 story** vì mức rủi ro khác hẳn nhau:

- **Mục B + C (layout bảng + 2-slot ảnh)** — lane **normal**: chỉ render/CSS,
  cờ rủi ro *existing behavior* + *weak proof* (layout không có assertion).
  Làm trước, giao nhanh, TD thấy kết quả ngay.
- **Mục D–H (bảng làm việc + ảnh riêng)** — lane **high-risk**: cờ *data
  model* (`state.bom` mọc thêm ảnh), *existing behavior*, *weak proof*,
  *multi-domain* (lưu/undo/autosave/in/xuất) — đủ 4 cờ. Cần bộ hồ sơ
  `docs/templates/high-risk-story/` (execplan · overview · design ·
  validation) và **G4 phải xong trước** (nếu không, TD điền BOM xong là mất).

**Việc nên làm ngay, không chờ chốt:** B1, B3, B4, B5 (layout thuần CSS,
không đụng dữ liệu) — chúng là phần TD nhìn thấy đầu tiên trong ảnh đích.

# Checklist đối chiếu BOM ↔ reference (TechPack output.html · mod-bom)

Đối chiếu từng phần của trang BOM (US-072/US-073) với phần BOM của file tham
chiếu `Tech pack Output/TechPack output.html` (bản trong `~/Downloads/Tech
pack Output/` **giống hệt** bản sibling — đã so hash/kích thước/đầu-cuối,
5.5MB · 7917 dòng).

Ký hiệu trạng thái:

- ✅ **ĐẠT** — đã giống reference, có test hoặc đã xác minh code.
- 🔧 **US-073** — gap, được xử lý trong story này.
- ⏸ **DEFERRED** — khác biệt CÓ CHỦ ĐÍCH (ADR 0041 drop list hoặc quyết định
  ghi ở đây); muốn làm phải mở story mới.
- Ô `[ ]` là để TD tick khi tự kiểm tra bằng tay theo cột "Cách kiểm tra".

---

## A. Cấu trúc bảng (cột)

| # | Hạng mục | Reference | Trạng thái | Cách kiểm tra |
|---|---|---|---|---|
| A1 | Thứ tự cột | DESCRIPTION → TYPE / COMPOSITION → SUPPLIER NAME → ARTICLE # → WIDTH → SIZE → AREA OF USE → MATERIAL IMAGES → cột màu | 🔧 US-073 (trước: areaOfUse đứng thứ 2, composition cuối) | [ ] Mở tab BOM, đọc hàng header từ trái sang phải |
| A2 | Nhãn cột song ngữ EN + 中文 | 描述 · 材质 / 成分 · 供应商名称 · 款号 · 宽度 · 尺码 · 使用部位 · 材料图片 (chuỗi lấy nguyên văn từ reference) | 🔧 US-073 (trước: chỉ EN, và sai chữ: "MATERIAL DESCRIPTION"/"SUPPLIER"/"COMPOSITION") | [ ] Header mỗi cột có dòng tiếng Trung nhỏ bên dưới |
| A3 | Cột `#` đánh số live, không lưu | Giống | ✅ (`bmNumberedRows`, bom.js) | [ ] Xoá 1 hàng → số các hàng sau tự dồn |
| A4 | Band section "MAIN BODY FABRICS" / "TRIMS / COMPONENTS", header lặp lại dưới mỗi band | Giống | ✅ | [ ] Nhìn 2 band xám đậm + 2 hàng header |
| A5 | Nút "+ Add FABRIC/TRIM row" cuối mỗi section (chỉ trên màn hình) | Giống (reference: "+ Dòng FABRIC") | ✅ | [ ] Bấm thêm hàng ở đúng section |

**DoD A:** Header đúng thứ tự + đủ song ngữ như bảng trên, khớp từng ký tự
với reference; `npm run bom-check` xanh (có assertion thứ tự cột); nhìn
side-by-side với reference không lệch cột nào.

## B. Hàng & đánh số

| # | Hạng mục | Trạng thái | Cách kiểm tra |
|---|---|---|---|
| B1 | Số chạy liên tục FABRIC → TRIM | ✅ | [ ] Hàng TRIM đầu tiên = số FABRIC cuối + 1 |
| B2 | Split size (⎘) thành cặp x.1/x.2, chung `groupId`, WIDTH/SIZE clone bị xoá để điền theo run | ✅ (`bmSplitRow`) | [ ] Bấm ⎘ → 2 hàng "N.1"/"N.2" |
| B3 | Pin material-key hiện số GỐC của cặp split ("3" cho 3.1/3.2) | ✅ (`bmRowBase`) | [ ] Callout của hàng split hiện số không có ".1" |

**DoD B:** 3 mục trên tick đủ; `bom-check` phần numbering xanh.

## C. Scope & sheet Solid/Lace

| # | Hạng mục | Trạng thái | Cách kiểm tra |
|---|---|---|---|
| C1 | 1 danh sách hàng chung, lọc theo scope `BOTH`/`SOLID`/`LACE` lúc render (không phải 2 bảng dữ liệu) | ✅ | [ ] Đổi scope 1 hàng → biến mất khỏi tab kia |
| C2 | Dropdown scope trên từng hàng | ✅ | [ ] Có select BOTH/SOLID/LACE ở cột hành động |
| C3 | Confirm khi xoá hàng scope BOTH | ⏸ DEFERRED — tool này dùng undo + toast thay confirm (native `confirm()` treo headless test; undo đã cover rủi ro) | — |

**DoD C:** C1–C2 tick; deviation C3 có ghi trong story.

## D. Cột màu (colorways)

| # | Hạng mục | Trạng thái | Cách kiểm tra |
|---|---|---|---|
| D1 | Cột màu lấy từ `state.mainPage.colorways` (MAIN PAGE quản lý thêm/bớt) | ✅ | [ ] Thêm màu ở MAIN PAGE → BOM thêm cột |
| D2 | Ô màu mặc định = value của colorway, override theo từng hàng (`cwOverride`) | ✅ | [ ] Sửa ô màu 1 hàng, hàng khác không đổi |
| D3 | Override chuỗi rỗng vẫn thắng default (TD chủ động xoá) | ✅ (check key-presence, bom.js `bmCwValue`) | [ ] Xoá trắng 1 ô màu → không hồi về default |
| D4 | `cw_default` cấp hàng (1 giá trị áp cho mọi cột màu) | ⏸ DEFERRED — reference dùng chủ yếu cho batch drafter (cũng deferred); thêm khi port drafter | — |

**DoD D:** D1–D3 tick; `bom-check` phần colorway xanh.

## E. Gợi ý vật liệu

| # | Hạng mục | Trạng thái | Cách kiểm tra |
|---|---|---|---|
| E1 | Gợi ý CHỌN TAY, không bao giờ tự điền đè ô đã gõ | ✅ (`bmApplyMaterial` fill-empty-only) | [ ] Gõ supplier trước, pick material → supplier giữ nguyên |
| E2 | ▾ trong ô cho 6 cột (description/area/supplier/article/width/size); composition không có ▾ | ✅ (khớp SUGGESTABLE_COLS của reference) | [ ] Đủ ▾ ở 6 cột |
| E3 | Cột phụ gợi ý theo material CỦA HÀNG (description khớp thư viện) | ✅ | [ ] Pick description rồi mở ▾ supplier → chỉ ra option của material đó |
| E4 | Thư viện 27 material (mined từ 1.748 record BOM lịch sử) | ✅ (`bom-material-data.js`) — reference có thêm phrase mined từ PDF | [ ] Search side panel ra material |
| E5 | Hiển thị provenance/count dưới từng gợi ý ("Vật tư nhà (rule + Excel)"…) | ⏸ DEFERRED — cần data island `bom_rule_library.json` của reference; tool offline chỉ mang snapshot | — |

**DoD E:** E1–E4 tick; assertion "never overwrites" trong `bom-check` xanh.

## F. Ảnh vật liệu (MATERIAL IMAGES)

| # | Hạng mục | Trạng thái | Cách kiểm tra |
|---|---|---|---|
| F1 | Ô ảnh mỗi hàng, upload/paste, lưu trong project, in ra sheet | ✅ (`row.photo.dataURL`) | [ ] Paste ảnh vào ô, save/open lại còn |
| F2 | Ô ảnh trống in ra TRẮNG (không in nút editor) | ✅ (print CSS) | [ ] Print preview: ô trống không có viền nút |
| F3 | Catalog ảnh (exact-article/same-material badge, "Fill from photo", cảnh báo drift đổi article) | ⏸ DEFERRED — cần `bom_image_catalog.json` (~data island lớn của reference); ADR 0041 drop list | — |

**DoD F:** F1–F2 tick.

## G. Material Key (callout trên sketch)

| # | Hạng mục | Trạng thái | Cách kiểm tra |
|---|---|---|---|
| G1 | Callout đa mũi tên (`targets[]`), leader line từ MÉP hộp label, có arrowhead | ✅ (fork engine Construction, prefix `bm*`) | [ ] + Arrow thêm mũi tên thứ 2 |
| G2 | Pin đầu = vòng tròn có SỐ hàng; anchor phụ = chấm nhỏ viền trắng | ✅ | [ ] Nhìn pin trên canvas |
| G3 | Màu #cc0066 (đúng hằng MK của reference), orphan đỏ #b3261e | ✅ | [ ] Xoá hàng → callout đỏ "? deleted BOM row" |
| G4 | Double-click arrowhead xoá đúng 1 leader line, giữ tối thiểu 1 | ✅ | [ ] Double-click mũi tên phụ |
| G5 | Relink orphan qua dropdown side panel | ✅ | [ ] Chọn hàng khác trong select |
| G6 | Nút ⊕ trên TỪNG HÀNG bảng → nhảy sang Material Key, arm đặt callout cho đúng hàng đó (tự đổi variant nếu scope 1 sheet) | 🔧 US-073 (trước: chỉ có nút "Add Callout" chung, link theo hàng đang chọn) | [ ] Bấm ⊕ hàng 3 → click sketch → callout số 3 |
| G7 | Label = `N. <mệnh-đề-đầu-của-description, cắt 40 ký tự>` | ✅ (`bmShortLabel` giống shortLabel reference) | [ ] Đặt description dài có dấu phẩy |
| G8 | Prefix `note` tự do trước số trên label | ⏸ DEFERRED — reference dùng cho ghi chú thủ công hiếm; chưa có nhu cầu | — |

**DoD G:** G1–G7 tick; `bom-check` phần callout xanh (thêm assertion ⊕).

## H. In ấn / xuất sheet — phần "giống reference" quan trọng nhất

| # | Hạng mục | Reference | Trạng thái | Cách kiểm tra |
|---|---|---|---|---|
| H1 | In ra HAI sheet: BOM-SOLID rồi BOM-LACE, ngắt trang giữa hai sheet | 2 sheet, `page-break-after` | 🔧 US-073 (trước: chỉ in 1 sheet theo tab đang mở) | [ ] ⌘P từ trang BOM → preview 2 trang |
| H2 | Sheet-head mỗi sheet: dòng meta style (`Range Name · Style # … · ngày` từ MAIN PAGE) + tên sheet `BOM-SOLID`/`BOM-LACE`, gạch chân đen 2px | `.sheethead` `.shl`/`.shm` | 🔧 US-073 | [ ] Đầu mỗi trang in có header đúng format |
| H3 | Hàng scope BOTH in trên CẢ 2 sheet; SOLID/LACE chỉ in sheet của nó | numberRows() lọc scope | 🔧 US-073 (theo H1) | [ ] Đặt 1 hàng LACE → chỉ xuất hiện trang 2 |
| H4 | Không in editor chrome: ▾, cột hành động, add-row, side panel, toolbar | screen-only class | ✅ (print CSS đã có) + print container mới không render chúng | [ ] Print preview sạch |
| H5 | Màn hình vẫn chỉ hiện 1 sheet theo tab (không đổi UX đang có) | — (quyết định của tool này) | 🔧 US-073 giữ nguyên screen, chỉ thêm container in | [ ] Tab Solid/Lace hoạt động như cũ |

**DoD H:** ⌘P từ trang BOM (kể cả đang đứng ở sub-view Material Key) ra đúng
2 trang có header, đúng lọc scope, không chrome; so cạnh bản in reference
không khác cấu trúc; `bom-check` có assertion `#bomPrintSheets` chứa 2 sheet
với số hàng đúng theo scope.

## I. Lưu / hoàn tác

| # | Hạng mục | Trạng thái | Cách kiểm tra |
|---|---|---|---|
| I1 | `state.bom` (rows + callouts) round-trip save/open đầy đủ | ✅ (`bom-check` test 14) | [ ] Save → open lại |
| I2 | Project cũ (pre-US-072) mở bình thường, seed BOM rỗng — **đã đổi bởi US-074 (2026-08-16): giờ seed 12 dòng BOM tham chiếu + `seedId`; test 13 assert theo contract mới** | ✅ (test 13) | [ ] Mở project cũ — kỳ vọng 12 dòng, không phải rỗng |
| I3 | Mọi thao tác undo được (1 entry/ô sửa, 1 entry/drag) | ✅ | [ ] ⌘Z sau từng thao tác |
| I4 | BOM là metadata thuần: không tạo anchor/POM/draft | ✅ (test 12 — invariant của tool) | — |

**DoD I:** `bom-check` 4 nhóm test này xanh.

## J. Khác biệt có chủ đích với reference (không làm, có lý do)

| # | Tính năng reference | Lý do bỏ |
|---|---|---|
| J1 | Dịch tiếng Trung nội dung ô (`cells_cn`, nút 中 CN, Anthropic API) | Tool này offline-by-design, không API runtime (invariant dự án). Header tĩnh song ngữ thì LÀM (A2). |
| J2 | ⚡ Draft toàn bộ (BOM_DRAFT rule-based batch drafter) | Cần `bom_rule_library.json` + luồng construction-features của reference; ADR 0041 drop list. |
| J3 | Catalog ảnh vật tư + Fill-from-photo + drift badge | Cần `bom_image_catalog.json` (data island lớn); ADR 0041 drop list. F1 upload/paste thay thế. |
| J4 | Confirm xoá hàng scope BOTH | Undo + toast của tool này cover; confirm() treo headless suite. |
| J5 | `cw_default` cấp hàng | Chỉ hữu ích khi có J2. |
| J6 | Provenance chi tiết trong picker gợi ý | Cần data island J2. Tag section/material đã có. |

> Muốn làm mục nào trong J: mở story mới qua intake (`docs/FEATURE_INTAKE.md`)
> — J2/J3 đụng data island lớn, cần quyết định mang bao nhiêu MB vào tool
> offline này.

---

## DoD tổng (Definition of Done của US-073)

1. `npm run build` && `npm run check` xanh (app.js regenerate + cache-buster
   sync).
2. `npm run bom-check` xanh: 47 assertion cũ + assertion mới (thứ tự cột +
   nhãn CN, ⊕ per-row, print container 2 sheet đúng scope).
3. Suite hàng xóm không vỡ: `npm run mainpage-check`,
   `npm run construction-check` xanh (BOM đụng CSS chung trong index.html).
4. Kiểm tra tay (TD tick các ô `[ ]` ở trên), tối thiểu: A1–A2 nhìn header,
   H1–H4 print preview 2 sheet, G6 luồng ⊕.
5. `state.bom` không đổi schema — project đang có mở lại y nguyên.
6. Story `story.md` cập nhật Status → done + Evidence (output bom-check,
   screenshot print preview).
7. Không đụng detection/POM: không cần golden/accuracy (BOM là metadata),
   nhưng `npm run check` đã xác nhận wiring toàn app.

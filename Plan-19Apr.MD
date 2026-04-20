# Kế hoạch: Rebrand Postiz → LightCircle (thị trường Việt Nam)

## Context

Postiz là tool lên lịch đăng bài social media đa kênh (34 provider). Mục tiêu của dự án này là biến Postiz thành một sản phẩm mới mang tên **LightCircle — Quản lý vòng tròn doanh nghiệp**, hướng đến thị trường Việt Nam. "Vòng tròn doanh nghiệp" ở đây được hiểu là tập hợp các kênh social media mà một doanh nghiệp đang quản lý — giữ nguyên cốt lõi scheduling của Postiz, nhưng:

- Xóa triệt để dấu vết thương hiệu Postiz (không dùng lại cờ `IS_GENERAL`).
- Localize sâu cho VN: giao diện tiếng Việt chuẩn, thêm kênh Zalo OA, thanh toán VNPay/Momo, xuất hóa đơn VAT.
- Thiết kế lại bộ nhận diện với palette xanh + vàng phù hợp thị hiếu VN.

Kết quả kỳ vọng: một bản build độc lập `lightcircle-app` có thể deploy và chạy độc lập, giữ nguyên kiến trúc monorepo (backend NestJS / frontend Vite React / orchestrator Temporal) và luồng 3-layer (Controller → Service → Repository).

---

## Giai đoạn 1 — Rebrand lõi (xóa dấu vết Postiz)

### 1.1. Package & metadata
- `package.json` (root): đổi `"name": "gitroom"` → `"lightcircle"`.
- `apps/backend/package.json`: `"postiz-backend"` → `"lightcircle-backend"`.
- `apps/frontend/package.json`: `"postiz-frontend"` → `"lightcircle-frontend"`.
- `apps/orchestrator/package.json`, `apps/workers/package.json` (nếu có): đổi tương tự.
- `apps/sdk/package.json` + `apps/sdk/README.md`: đổi tên SDK.
- `version.txt`, `sonar-project.properties`, `.devcontainer/devcontainer.json`: xóa chuỗi "Postiz".

### 1.2. Env var & domain
- Rename toàn bộ biến env có tiền tố `POSTIZ_*` hoặc chứa "postiz" trong `.env.example`, `docker-compose.yaml`, `docker-compose.dev.yaml`, `railway.toml`:
  - `NEXT_PUBLIC_POSTIZ_OAUTH_*` → `NEXT_PUBLIC_LIGHTCIRCLE_OAUTH_*`
  - Các biến analytics domain `postiz.com` → `lightcircle.vn` (hoặc domain chính thức).
- `apps/frontend/src/proxy.ts`, `apps/frontend/src/app/(app)/layout.tsx`: thay domain Plausible hardcode.

### 1.3. Gỡ bỏ cờ `IS_GENERAL`
- `libraries/helpers/src/utils/is.general.server.side.ts` và `libraries/react-shared-libraries/src/helpers/is.general.tsx`: xóa, hoặc đổi thành `getBrand()` trả về `'lightcircle'`.
- Tìm và thay thế 22 file đang dùng `isGeneralServerSide()` (danh sách đã có từ exploration): thay bằng chuỗi cố định "LightCircle" hoặc gọi hàm `getBrandName()` mới.
- Xóa nhánh `else` (Gitroom) — không cần variant thứ hai nữa.

### 1.4. Assets thương hiệu
- **Thay logo**: `apps/frontend/public/logo.svg`, `logo-text.svg`, `favicon.ico`, `favicon.png`.
- **Component logo inline**: `apps/frontend/src/components/new-layout/logo.tsx` — thay SVG path, đổi màu hardcode `#612BD3`.
- **Auth backgrounds**: `apps/frontend/public/auth/bg-login.png`, `login-box.png` — thay hình hoặc dùng gradient CSS mới.
- **Browser extension**: `manifest.json`, `manifest.dev.json` — đổi `"name": "Postiz"` → `"LightCircle"`.
- **OG image & meta tags**: tìm trong `apps/frontend/src/app/(app)/layout.tsx`.

---

## Giai đoạn 2 — Bộ nhận diện mới (xanh + vàng)

### 2.1. Palette mới trong `apps/frontend/src/app/colors.scss`
Đề xuất token (thay giá trị, giữ nguyên tên biến để không phải đổi components):
- **Primary** (`--new-btn-primary`, `--color-forth`): `#0A5CD8` (xanh cobalt, gợi tin cậy — thay `#612bd3`).
- **Accent/CTA** (thêm `--new-accent`): `#F5B700` (vàng mật, dùng cho highlight/badge).
- **Success**: giữ `#13c296` hoặc đổi `#16A34A` cho phẳng hơn.
- **Dark mode bg**: `#0B1220` (xanh navy tối) thay cho `#0e0e0e`.
- **Light mode bg**: `#F7F9FC` giữ cảm giác sạch.

### 2.2. Dọn dẹp `--color-custom*`
- CLAUDE.md đã nói các biến `--color-custom1..55` deprecated.
- Trong giai đoạn này **không xóa vội** (để tránh vỡ component cũ), nhưng:
  - Khi chạm vào component nào dùng `customColor*` thì refactor sang token mới.
  - Thêm ESLint rule cảnh báo khi dùng `--color-custom*`.

### 2.3. Logo mới
- Concept đơn giản: một vòng tròn (circle) + điểm sáng (light) — tượng trưng "vòng tròn" + "ánh sáng".
- Font tên: dùng Inter hoặc Be Vietnam Pro (đã tối ưu cho dấu tiếng Việt).
- Giao file `.svg` vào `apps/frontend/public/logo.svg` và update component.

---

## Giai đoạn 3 — Localize tiếng Việt

### 3.1. Rà soát `vi/translation.json`
- File: `libraries/react-shared-libraries/src/translation/locales/vi/translation.json` (~300 keys đã có).
- Các chuỗi dạng `"webhooks_are_a_way_to_get_notified_when_something_happens_in_postiz_via_an_http_request"` có embedded "Postiz" → grep và dịch lại thành "LightCircle".
- Bổ sung các keys còn thiếu (so với `en/translation.json` làm nguồn).

### 3.2. Default locale
- `i18n.json` hiện có `source: "en"`. Giữ nguyên để dịch về các ngôn ngữ khác, nhưng:
- Ứng dụng khi chạy: mặc định `vi` cho người dùng mới (detect Accept-Language hoặc cứng).
- Tìm `defaultLanguage` trong provider i18n của frontend và set `vi`.

### 3.3. Timezone & format
- Mặc định timezone người dùng mới: `Asia/Ho_Chi_Minh`.
- Format date: `DD/MM/YYYY`.
- Số tiền: format VND (`123.456 ₫`), không dùng dấu thập phân.
- Nơi chạm: `libraries/helpers/src/utils/` (tìm date/number formatter).

---

## Giai đoạn 4 — Tích hợp Zalo Official Account

### 4.1. Provider mới
- Tạo file: `libraries/nestjs-libraries/src/integrations/social/zalo.provider.ts`.
- Implement interface `SocialProvider` (xem `social.integrations.interface.ts` và `social.abstract.ts`).
- Các method bắt buộc: `generateAuthUrl`, `authenticate`, `refreshToken`, `post`, `analytics`, `delete`.
- API Zalo OA docs: `https://developers.zalo.me/docs/official-account` — dùng OAuth 2.0 + access token.

### 4.2. Register provider
- Đăng ký trong `libraries/nestjs-libraries/src/integrations/integration.manager.ts`.
- Thêm icon `zalo.svg` vào `apps/frontend/public/icons/` (hoặc folder provider icons hiện tại).
- Thêm key i18n cho "Zalo OA".

### 4.3. Đặc thù Zalo
- Giới hạn ký tự bài đăng: ~500.
- Hỗ trợ text + 1 image hoặc text + link preview.
- Không hỗ trợ video trực tiếp — validate ở FE trước khi submit.

---

## Giai đoạn 5 — Thanh toán VNPay & Momo

### 5.1. Abstract payment gateway
- Hiện tại `libraries/nestjs-libraries/src/services/stripe.service.ts` chứa logic Stripe thuần.
- Tạo interface mới: `libraries/nestjs-libraries/src/services/payment/payment.interface.ts`:
  - `createCheckout(orgId, tier, cycle): Promise<{url}>`
  - `handleWebhook(headers, body): Promise<PaymentEvent>`
  - `cancelSubscription(orgId): Promise<void>`
- Tách `StripeService` thành `StripeProvider implements PaymentProvider`.
- Thêm `VnpayProvider`, `MomoProvider`.

### 5.2. VNPay
- Lib: dùng `vnpay` npm package (Node SDK phổ biến).
- Env: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VNPAY_RETURN_URL`.
- Hỗ trợ QR + ATM nội địa + Visa.
- Webhook: VNPay dùng IPN URL, signature SHA512 — xử lý ở `stripe.controller.ts` (đổi tên thành `billing.controller.ts`).

### 5.3. Momo
- Lib: `momo-pay` hoặc tự call REST (endpoint `/v2/gateway/api/create`).
- Env: `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`.
- Webhook: Momo ping `redirectUrl` + `ipnUrl`.

### 5.4. Subscription model
- Bảng `Subscription` trong Prisma giữ nguyên nhưng thêm cột:
  - `paymentProvider: enum('stripe' | 'vnpay' | 'momo')` — default `vnpay`.
  - `paymentProviderId: string?` — id từ gateway (Momo tự sinh, VNPay dùng txnRef).
- Migration: `pnpm --filter @gitroom/nestjs-libraries prisma migrate dev --name add_payment_provider`.

### 5.5. Giá VND
- Pricing config hiện tại ở đâu (cần tìm trong `libraries/nestjs-libraries`) — đổi tier PRO/ULTIMATE sang VND:
  - FREE: 0 ₫
  - PRO: 299.000 ₫/tháng
  - ULTIMATE: 799.000 ₫/tháng
- Hoặc làm pricing theo từng gateway — tốt nhất dùng VND cho VNPay/Momo, USD dự phòng cho Stripe quốc tế.

---

## Giai đoạn 6 — Hóa đơn VAT & thông tin doanh nghiệp

### 6.1. Mở rộng Organization schema
- Thêm field vào `model Organization` (Prisma):
  - `taxCode: String?` (MST)
  - `companyName: String?`
  - `companyAddress: String?`
  - `invoiceEmail: String?`
- Migration kèm theo.

### 6.2. Form nhập trong Settings
- `apps/frontend/src/components/settings/` — thêm section "Thông tin doanh nghiệp (xuất hóa đơn)".
- Validate MST: regex `/^\d{10}(-\d{3})?$/`.

### 6.3. Xuất hóa đơn
- **Giai đoạn 1**: tạo PDF hóa đơn nội bộ (không kết nối nhà cung cấp hóa đơn điện tử chính thức) — dùng `pdfkit` hoặc `puppeteer` render HTML.
- **Giai đoạn 2** (tương lai): tích hợp MISA meInvoice / VNPT Invoice qua API — để sau.
- Endpoint: `GET /billing/invoice/:id.pdf` trong `billing.controller.ts`.

---

## Các file critical sẽ chạm

| Mục đích | File/folder |
|---|---|
| Rebrand name | `package.json` (root + apps), `.env.example`, `docker-compose*.yaml` |
| Gỡ `IS_GENERAL` | `libraries/helpers/src/utils/is.general.server.side.ts`, `libraries/react-shared-libraries/src/helpers/is.general.tsx` + 20 call sites |
| Logo/assets | `apps/frontend/public/*`, `apps/frontend/src/components/new-layout/logo.tsx` |
| Palette | `apps/frontend/src/app/colors.scss`, `global.scss`, `tailwind.config.cjs` |
| i18n | `libraries/react-shared-libraries/src/translation/locales/vi/translation.json` |
| Zalo | `libraries/nestjs-libraries/src/integrations/social/zalo.provider.ts` (mới) + `integration.manager.ts` |
| Payment abstraction | `libraries/nestjs-libraries/src/services/payment/*.ts` (mới), refactor `stripe.service.ts` |
| Schema | `libraries/nestjs-libraries/src/database/prisma/schema.prisma` |
| Billing controller | `apps/backend/src/api/routes/stripe.controller.ts` → `billing.controller.ts` |

---

## Thứ tự thực hiện (roadmap 6 tuần gợi ý)

1. **Tuần 1** — Rebrand lõi (1.1–1.4): đổi tên, gỡ `IS_GENERAL`, logo placeholder. Smoke test `pnpm dev`.
2. **Tuần 2** — Palette mới + dọn colors.scss (2.1–2.3). QA trên mọi page.
3. **Tuần 3** — Localize VI (3.1–3.3): dịch đầy đủ, default locale, timezone.
4. **Tuần 4** — Zalo provider (Giai đoạn 4).
5. **Tuần 5** — Payment abstraction + VNPay (5.1, 5.2, 5.4, 5.5).
6. **Tuần 6** — Momo + hóa đơn VAT (5.3, Giai đoạn 6). Release candidate.

---

## Verification

### Sau giai đoạn 1–3 (rebrand + palette + i18n):
- `pnpm dev` chạy được backend + frontend + orchestrator.
- `grep -ri "postiz" apps libraries --include="*.ts" --include="*.tsx" --include="*.json"` — còn lại 0 match (hoặc chỉ trong comment lịch sử).
- Mở `http://localhost:4200` → thấy logo LightCircle, UI tiếng Việt mặc định, palette xanh/vàng.
- Đăng ký tài khoản mới → email activation có branding LightCircle.

### Sau giai đoạn 4 (Zalo):
- Trong Launches → thêm integration → thấy Zalo trong danh sách.
- Kết nối được Zalo OA sandbox.
- Lên lịch 1 bài, đến giờ Temporal worker đăng thành công.

### Sau giai đoạn 5 (payment):
- Checkout VNPay sandbox thành công, webhook cập nhật đúng `Subscription`.
- Checkout Momo sandbox thành công.
- Hủy subscription → `cancel_at_period_end` đúng.

### Sau giai đoạn 6 (VAT):
- Nhập MST + tên công ty trong Settings, lưu thành công.
- Download PDF hóa đơn sau giao dịch, đúng MST + giá VND + VAT 10%.

### Regression
- `pnpm lint` (chạy từ root — CLAUDE.md) pass.
- `pnpm test` pass các suite hiện có.
- Các provider social cũ (Facebook, TikTok, YouTube, LinkedIn, Instagram, Telegram) vẫn đăng bình thường.

---

## Rủi ro & lưu ý

- **Upstream sync**: Sau rebrand toàn bộ sẽ rất khó merge lại commit mới từ Postiz upstream. Chấp nhận fork hẳn, hoặc giữ một `upstream` remote và cherry-pick thủ công.
- **Credit cho upstream**: LICENSE của Postiz (AGPL hoặc tương tự) **phải giữ** trong repo — kiểm tra `LICENSE` file, không xóa.
- **Payment compliance**: VNPay/Momo yêu cầu ký hợp đồng merchant + domain đã đăng ký. Giai đoạn dev dùng sandbox, production cần hợp đồng trước.
- **Zalo OA**: cần tài khoản Zalo Business Developer + OA đã verify để lấy API key.
- **Kích thước i18n**: file `vi/translation.json` hiện có ~300 keys nhưng bản `en` có thể hơn — so sánh bằng script để không sót.

# Retail Enterprise Integration Platform (EAI)

Sistem Enterprise Application Integration lengkap yang mengintegrasikan 5 microservices terpisah (information silos) menggunakan RabbitMQ message broker, API Gateway, dan Integration Layer, lengkap dengan Frontend SPA.

## 🚀 Fitur Utama
- **Microservices Architecture:** 9 service terpisah
- **Heterogeneous Databases:** PostgreSQL (3x) dan MySQL (2x)
- **Message Broker:** RabbitMQ dengan Fanout & Direct Exchanges
- **Frontend SPA:** Full CRUD dengan Dark Enterprise Theme
- **Data Transformation:** XML ke Canonical JSON
- **Docker Compose:** Full containerization (16 container)

## 🏗️ Enterprise Integration Patterns (EIP) yang Digunakan
1. **Message Channel:** RabbitMQ Queues
2. **Message Endpoint:** RabbitMQ Consumers (di Inventory, Accounting, CRM)
3. **Message Router:** Message Router Service
4. **Content-Based Router:** Mengecek stok, routing ke Success/Rejection queue
5. **Message Translator:** Konversi XML dari POS menjadi JSON Canonical
6. **Publish-Subscribe:** Fanout exchange broadcast event dari POS/E-Commerce
7. **Canonical Data Model:** `SalesEvent` standard object
8. **Dead Letter Queue (DLQ):** Handling message error/failed

## ⚙️ Cara Menjalankan

1. Pastikan Docker dan Docker Compose terinstall.
2. Clone repository ini.
3. Jalankan perintah:
```bash
docker compose up --build -d
```
4. Tunggu beberapa saat agar database selesai melakukan inisialisasi.
5. Akses Frontend melalui browser di: `http://localhost:8080`
6. Login dengan:
   - Username: `admin`
   - Password: `admin123`

## 🔗 Port dan Service
- **Frontend SPA:** `8080`
- **API Gateway:** `3000`
- **RabbitMQ UI:** `15672` (user: eai_admin, pass: eai_secret_2024)
- **POS Service:** `3001`
- **Inventory Service:** `3002`
- **Accounting Service:** `3003`
- **CRM Service:** `3004`
- **E-Commerce Service:** `3005`

## 🧪 Skenario Demo
1. **POS Sale:** Buat transaksi di halaman POS. Sistem POS akan menghasilkan XML, yang kemudian ditransformasi dan dibroadcast ke Inventory (stok berkurang), Accounting (jurnal tercatat), dan CRM (history bertambah).
2. **E-Commerce Order:** Buat pesanan baru. Alur integrasi yang sama akan ter-trigger.
3. **Stock Checking:** Jika mencoba beli barang dengan kuantitas > stok, Message Router akan memasukkan pesan ke `Rejection Queue`.

# Siber Güvenlik Tehdit Modelleme ve Saldırı Yolu Analizi

Bu proje, siber güvenlik tehdit modelleme ve saldırı yolu analizi için bir frontend prototipidir. Topoloji görselleştirme, risk hesaplama ve saldırı yolu analizi özelliklerini içerir.

## Özellikler

- **3-Panel Arayüz**: Varlık kütüphanesi, topoloji tuvali ve analiz motoru
- **Drag-and-Drop**: Varlıkları tuval üzerine sürükleyerek topoloji oluşturma
- **Risk Görselleştirme**: CVSS skorlarına göre renk kodlu düğümler (yeşil → kırmızı)
- **Saldırı Yolu Analizi**: Dijkstra ve DFS algoritmaları ile en riskli yolları bulma
- **Senaryo Simülasyonu**: Güvenlik duvarı kapalı, yama uygulandı gibi senaryoları test etme
- **STRIDE Overlay**: STRIDE kategorilerine göre düğüm etiketleme
- **SVG Export**: Topolojiyi SVG formatında dışa aktarma

## Kurulum ve Çalıştırma

### Yöntem 1: Doğrudan HTML Açma
1. `index.html` dosyasını bir web tarayıcısında açın
2. Tüm dosyalar (`styles.css`, `app.js`) aynı klasörde olmalıdır

### Yöntem 2: Yerel Web Sunucusu (Önerilen)
```bash
# Python 3 ile
python -m http.server 8000

# Node.js ile (http-server kurulu olmalı)
npx http-server

# Ardından tarayıcıda http://localhost:8000 adresine gidin
```

## Kullanım

### 1. Topoloji Oluşturma

**Varsayılan Topoloji:**
- Sayfa yüklendiğinde otomatik olarak örnek bir topoloji yüklenir (Internet → Web Sunucusu → DB Sunucusu)

**Yeni Varlık Ekleme:**
- Sol paneldeki varlık ikonlarını orta panele sürükleyin
- Düğümler tıklanabilir ve sürüklenebilir

**Senaryo Yükleme:**
- "Senaryo Yükle" butonuna tıklayın
- Dropdown menüden bir senaryo seçin:
  - **Varsayılan Topoloji**: Temel 3 düğümlü yapı
  - **Basit Üç Katmanlı**: Web, Uygulama, Veritabanı katmanları
  - **DMZ Örneği**: DMZ ve iç ağ yapısı
  - **IoT Yoğun Örnek**: IoT cihazları ve sunucu yapısı

### 2. Analiz Çalıştırma

1. **Algoritma Seçimi**: Sağ panelde algoritma seçin (Dijkstra, DFS, vb.)
2. **Veri Kaynağı**: NVD API, CVE Feed veya CWE butonlarından birini seçin (şu anda mock)
3. **Analizi Başlat**: "Analizi Başlat" butonuna tıklayın
4. **Sonuçları İncele**:
   - Genel Sistem Skoru
   - Toplam CVE Sayısı
   - En Riskli Saldırı Yolu
   - Hesaplama logları

### 3. Senaryo Simülasyonu

1. Senaryo dropdown'ından bir simülasyon seçin:
   - **Güvenlik Duvarı Kapalı**: Tüm bağlantıları daha riskli yapar
   - **Yama Uygulandı**: Yüksek riskli CVE'leri kaldırır
   - **Yeni Zafiyet Tespit Edildi**: Rastgele bir düğüme kritik CVE ekler
2. "Simülasyonu Çalıştır" butonuna tıklayın
3. Analiz otomatik olarak yeniden çalışır

### 4. Düğüm Detayları

- Topoloji üzerindeki bir düğüme tıklayın
- Modal pencerede şunları görebilirsiniz:
  - Düğüm özellikleri (OS, servisler, portlar)
  - CVE listesi ve CVSS skorları
  - Ortalama CVSS skoru

### 5. Görselleştirme Özellikleri

- **Risk Heatmap**: Düğümler CVSS skorlarına göre renklendirilir (yeşil = düşük risk, kırmızı = yüksek risk)
- **STRIDE Overlay**: Checkbox'ı işaretleyerek STRIDE kategorilerini görüntüleyin
- **Kritik Yol**: Analiz sonrası en riskli yol kırmızı çizgi ile vurgulanır
- **SVG Export**: "SVG Olarak Dışa Aktar" butonu ile topolojiyi kaydedin

## Mock Fonksiyonlar ve Gerçek Entegrasyon

### Şu Anda Mock Olan Fonksiyonlar

1. **`fetchCVE(node)`** - `app.js` satır ~550
   - Şu anda mock CVE verisi döndürüyor
   - Gerçek entegrasyon: NVD API çağrısı yapılacak

2. **`matchCPE(node)`** - `app.js` satır ~580
   - Basit string matching yapıyor
   - Gerçek entegrasyon: CPE veritabanı veya LLM ile normalizasyon

3. **Veri Kaynağı Butonları**
   - Sadece görsel geri bildirim veriyor
   - Gerçek entegrasyon: API endpoint'leri bağlanacak

### NVD API Entegrasyonu

**Endpoint:**
```
https://services.nvd.nist.gov/rest/json/cves/2.0
```

**Örnek Kullanım:**
```javascript
// CPE ile CVE sorgulama
const cpeName = 'cpe:2.3:a:apache:http_server:2.4.41';
const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=${cpeName}`;

fetch(url)
  .then(response => response.json())
  .then(data => {
    const cves = data.vulnerabilities.map(v => ({
      id: v.cve.id,
      cvssScore: v.cve.metrics.cvssMetricV31[0].cvssData.baseScore,
      description: v.cve.descriptions[0].value
    }));
    return cves;
  });
```

**Rate Limit:**
- API key olmadan: 5 istek / 30 saniye
- API key ile: 50 istek / 30 saniye
- **Öneri**: Backend'de caching mekanizması kullanın

**API Key Alma:**
1. https://nvd.nist.gov/developers/request-an-api-key adresinden başvuru yapın
2. API key'i environment variable olarak saklayın
3. İsteklerde header olarak ekleyin: `apiKey: YOUR_API_KEY`

### Backend Entegrasyon Notları

**Önerilen Backend Yapısı:**

1. **CVE Cache Servisi**
   - NVD API'den gelen verileri cache'le
   - Redis veya in-memory cache kullan
   - TTL: 24 saat

2. **CPE Matching Servisi**
   - Cihaz özelliklerinden CPE string'i oluştur
   - LLM veya pattern matching kullan
   - CPE veritabanı ile eşleştir

3. **Rate Limit Yönetimi**
   - Backend'de rate limiting uygula
   - Queue mekanizması kullan
   - Batch request'ler yap

4. **Authentication**
   - API key'leri backend'de sakla
   - Frontend'den direkt NVD API çağrısı yapma

## Hesaplama Formülleri

### Kenar Maliyeti
```
edge_cost = max(0.1, 10 - normalized_cvss)
```
- `normalized_cvss`: Düğümlerin ortalama CVSS skorunun ortalaması (0-10)
- Yüksek CVSS = düşük maliyet = daha riskli yol
- Dijkstra algoritması düşük maliyetli yolları tercih eder

### Ortalama CVSS
```
avg_cvss = sum(cve.cvssScore) / cve_count
```

### Genel Sistem Skoru
```
system_score = sum(node.avg_cvss) / node_count
```

## Test Senaryoları

### Senaryo 1: Basit Üç Katmanlı
1. "Senaryo Yükle" → "Basit Üç Katmanlı" seçin
2. "Analizi Başlat" butonuna tıklayın
3. **Beklenen Çıktı:**
   - Genel Sistem Skoru: ~7.0-8.0
   - En Riskli Yol: Internet → Web Katmanı → Uygulama Katmanı → Veritabanı Katmanı
   - Toplam CVE: ~8-10

### Senaryo 2: DMZ Örneği
1. "Senaryo Yükle" → "DMZ Örneği" seçin
2. "Analizi Başlat" butonuna tıklayın
3. **Beklenen Çıktı:**
   - Genel Sistem Skoru: ~6.5-7.5
   - En Riskli Yol: Internet → Güvenlik Duvarı → DMZ Web → İç Web → Veritabanı
   - Güvenlik duvarı düğümü görünür

### Senaryo 3: IoT Yoğun Örnek
1. "Senaryo Yükle" → "IoT Yoğun Örnek" seçin
2. "Analizi Başlat" butonuna tıklayın
3. **Beklenen Çıktı:**
   - Genel Sistem Skoru: >8.0 (IoT cihazları yüksek riskli)
   - En Riskli Yol: Internet → Router → IoT cihazları → IoT Sunucusu
   - Toplam CVE: ~12-15

### Senaryo 4: Simülasyon Testi
1. Varsayılan topolojiyi yükleyin
2. "Güvenlik Duvarı Kapalı" simülasyonunu çalıştırın
3. Analizi tekrar çalıştırın
4. **Beklenen Çıktı:**
   - Sistem skoru artmalı
   - Yeni kritik yol görünmeli
   - Log panelinde simülasyon mesajları görünmeli

## Kod Yapısı

```
├── index.html          # Ana HTML yapısı
├── styles.css          # CSS stilleri (dark tema, grid layout)
├── app.js              # JavaScript mantığı (algoritmalar, rendering)
└── README.md           # Bu dosya
```

### Önemli Fonksiyonlar

- `loadDefaultTopology()`: Varsayılan topolojiyi yükler
- `dijkstra(sourceId)`: Dijkstra algoritmasını çalıştırır
- `findAllPathsDFS(sourceId)`: DFS ile tüm yolları bulur
- `calculateEdgeCosts()`: Kenar maliyetlerini hesaplar
- `renderTopology()`: SVG üzerinde topolojiyi çizer
- `runAnalysis()`: Ana analiz fonksiyonu
- `fetchCVE(node)`: CVE verilerini çeker (mock)

## Teknik Detaylar

- **Framework**: Vanilla JavaScript (framework bağımlılığı yok)
- **Görselleştirme**: SVG (Scalable Vector Graphics)
- **Algoritmalar**: Dijkstra, DFS (client-side)
- **Veri Formatı**: JSON (mock CVE verileri)
- **Tarayıcı Desteği**: Modern tarayıcılar (Chrome, Firefox, Edge, Safari)

## Geliştirme Notları

### Yapılacaklar (Backend Entegrasyonu)

1. **NVD API Entegrasyonu**
   - `fetchCVE()` fonksiyonunu gerçek API çağrısı ile değiştir
   - Rate limiting ve caching ekle
   - Error handling iyileştir

2. **CPE Matching**
   - `matchCPE()` fonksiyonunu geliştir
   - CPE veritabanı entegrasyonu
   - LLM veya pattern matching kullan

3. **Backend API**
   - RESTful API oluştur
   - Authentication/Authorization ekle
   - Database entegrasyonu (topoloji kaydetme/yükleme)

4. **Gelişmiş Algoritmalar**
   - Floyd-Warshall implementasyonu
   - A* algoritması
   - Multi-objective optimization

5. **Görselleştirme İyileştirmeleri**
   - Animasyonlar
   - Zoom/pan özellikleri
   - Daha detaylı risk heatmap

## Lisans

Bu proje araştırma amaçlı bir prototiptir. Kod açık kaynak olarak paylaşılmaktadır.

## İletişim

Sorularınız veya önerileriniz için issue açabilirsiniz.


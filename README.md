# MOBIQU — 3D Packing Optimizer

Sıcaklık kontrollü Mobiqu konteynerleri için 3D yük hacmi ve kat kat paketleme simülatörü.
**React 19**, **TypeScript**, **Three.js** ve **Vite** ile geliştirilmiştir.

---

## 🚀 Projeyi Bilgisayarınızda Çalıştırma (Local Development)

Proje modern bir React + Vite uygulaması olduğu için doğrudan `index.html` dosyasına çift tıklanarak çalıştırılamaz (tarayıcılar `.tsx` TypeScript dosyalarını doğrudan derleyemez).

Projeyi çalıştırmak için:

1. **Node.js** yüklü olduğundan emin olun ([nodejs.org](https://nodejs.org/)).
2. İndirdiğiniz zip dosyasını bir klasöre çıkartın ve terminali o klasörde açın.
3. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
4. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```
5. Tarayıcınızda açın:
   👉 `http://localhost:3000`

---

## 📦 Statik Olarak Çalıştırma / Derleme (Production Build)

Uygulamanın tek parça statik HTML/JS/CSS haline getirilmiş sürümünü üretmek için:

```bash
npm run build
```

Derleme çıktısı `dist/` klasörüne oluşturulur. Artık `base: './'` ayarlandığı için GitHub Pages, Vercel, Netlify veya yerel sunucularda beyaz sayfa hatası vermeden doğrudan çalışır.

Derlenmiş sürümü yerel olarak test etmek için:
```bash
npm run preview
# veya
npx serve dist
```

---

## 🐙 GitHub'a Yükleme (Terminal ile Kesin Çözüm)

Google AI Studio arayüzündeki *"Failed to push commit to GitHub: permission denied"* hatası, GitHub OAuth yetkilendirmesinde AI Studio'ya repoya yazma (write/push) izni verilmemesinden kaynaklanır.

Bunu çözmek için projenizi terminalden doğrudan GitHub reponuza (`sertanozcan/mobiqu`) yükleyebilirsiniz:

```bash
# 1. Proje klasöründe terminali açın
cd mobiqu

# 2. Git başlatın ve dosyaları ekleyin
git init
git add .
git commit -m "feat: Mobiqu 3D packing optimizer with layer animation, video & PDF export"

# 3. Ana dalı main olarak ayarlayın
git branch -M main

# 4. GitHub reponuzu bağlayın
git remote add origin https://github.com/sertanozcan/mobiqu.git

# 5. Repoya push edin
git push -u origin main --force
```

> **Not:** Şifre sorduğunda GitHub şifreniz yerine [GitHub Personal Access Token (PAT)](https://github.com/settings/tokens) kullanmanız gerekmektedir (`repo` izni seçilmiş olmalıdır).

---

## 🌐 GitHub Pages Otomatik Yayını

Projeye `.github/workflows/deploy.yml` GitHub Actions iş akışı eklenmiştir. Projeyi GitHub'daki `main` dalına push ettiğinizde:
1. GitHub Actions otomatik olarak `npm run build` komutunu çalıştırır.
2. Derlenen `dist` çıktısını otomatik olarak **GitHub Pages**'e yükler.
3. Reponuzun **Settings -> Pages -> Source** kısmından `GitHub Actions` seçildiğinde uygulamanız `https://sertanozcan.github.io/mobiqu/` adresinde canlıya çıkar.

---

## ✨ Özellikler

- **Kat Kat Yükleme Animasyonu**: Kutuları tabandan tavana doğru tek tek yükler, kat tamamlandığında görsel bildirim verir ve üst kata geçer.
- **Video Export (WebM/MP4)**: 3D yükleme animasyonunu video olarak kaydeder ve indirir.
- **PDF Kat Planı Raporu**: Her kat için kuşbakışı 2D dizilim şeması, kutu numaraları ve operatör talimatları içeren çok sayfalı resmi rapor üretir.
- **Sıcaklık Aralığı & Konteyner Kataloğu**: +2/+8 °C, -25/-15 °C, +15/+25 °C Mobiqu konteyner ölçüleri.
- **Döndürme Kısıtları**: Sıvı/ilaç için dikey eksen kilidi (Z) veya 6 yönlü serbest dönüş.
- **Aydınlık / Karanlık Tema**: Modern, kullanıcı dostu arayüz.
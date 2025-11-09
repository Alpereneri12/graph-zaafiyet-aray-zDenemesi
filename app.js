/**
 * Siber Güvenlik Tehdit Modelleme ve Saldırı Yolu Analizi
 * Frontend Prototip - Mock Veri ve Client-Side Algoritmalar
 * 
 * Bu dosya, topoloji görselleştirme, saldırı yolu analizi ve
 * risk hesaplama fonksiyonlarını içerir.
 */

// ==================== GLOBAL STATE ====================

/**
 * Topoloji grafiği: düğümler ve kenarlar
 * Her düğüm: { id, type, label, x, y, cves: [], properties: {} }
 * Her kenar: { from, to, cost, critical: boolean }
 */
let topology = {
    nodes: [],
    edges: []
};

/**
 * SVG canvas referansı ve boyutları
 */
let svg, svgWidth, svgHeight;

/**
 * Seçili düğüm ve sürükleme durumu
 */
let selectedNode = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

/**
 * Mock CVE veritabanı
 * Gerçek uygulamada bu veriler NVD API'den çekilecek
 */
const mockCVE = {
    'server': [
        { id: 'CVE-2023-1234', cvssScore: 9.8, description: 'Kritik uzaktan kod çalıştırma zafiyeti' },
        { id: 'CVE-2023-5678', cvssScore: 7.5, description: 'Ayrıcalık yükseltme zafiyeti' },
        { id: 'CVE-2023-9012', cvssScore: 6.2, description: 'Bilgi ifşası zafiyeti' }
    ],
    'database': [
        { id: 'CVE-2023-2345', cvssScore: 8.9, description: 'SQL enjeksiyon zafiyeti' },
        { id: 'CVE-2023-3456', cvssScore: 7.1, description: 'Kimlik doğrulama bypass' }
    ],
    'router': [
        { id: 'CVE-2023-4567', cvssScore: 8.2, description: 'Yönlendirme tablosu manipülasyonu' },
        { id: 'CVE-2023-5678', cvssScore: 5.4, description: 'DoS zafiyeti' }
    ],
    'firewall': [
        { id: 'CVE-2023-6789', cvssScore: 6.8, description: 'Kural bypass zafiyeti' }
    ],
    'iot': [
        { id: 'CVE-2023-7890', cvssScore: 9.1, description: 'Varsayılan şifre zafiyeti' },
        { id: 'CVE-2023-8901', cvssScore: 7.3, description: 'Firmware güncelleme zafiyeti' }
    ],
    'pc': [
        { id: 'CVE-2023-9012', cvssScore: 7.8, description: 'Yerel ayrıcalık yükseltme' }
    ],
    'default': [
        { id: 'CVE-2023-0001', cvssScore: 5.0, description: 'Genel güvenlik zafiyeti' }
    ]
};

/**
 * STRIDE kategorileri ve renkleri
 */
const STRIDE_COLORS = {
    'S': '#FF3B30', // Spoofing - Kırmızı
    'T': '#FF9500', // Tampering - Turuncu
    'R': '#FFCC00', // Repudiation - Sarı
    'I': '#34C759', // Information Disclosure - Yeşil
    'D': '#007AFF', // Denial of Service - Mavi
    'E': '#AF52DE'  // Elevation of Privilege - Mor
};

// ==================== INITIALIZATION ====================

/**
 * Sayfa yüklendiğinde başlatma fonksiyonu
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeCanvas();
    initializeDragAndDrop();
    initializeEventListeners();
    loadDefaultTopology();
    renderTopology();
});

/**
 * SVG canvas'ı başlatır ve boyutları ayarlar
 */
function initializeCanvas() {
    svg = document.getElementById('topology-canvas');
    const container = svg.parentElement;
    
    function updateCanvasSize() {
        svgWidth = container.clientWidth;
        svgHeight = container.clientHeight;
        svg.setAttribute('width', svgWidth);
        svg.setAttribute('height', svgHeight);
        renderTopology();
    }
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
}

/**
 * Drag and drop işlevselliğini başlatır
 */
function initializeDragAndDrop() {
    const assetItems = document.querySelectorAll('.asset-item');
    
    assetItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: item.dataset.type,
                label: item.dataset.label
            }));
        });
    });
    
    svg.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    svg.addEventListener('drop', (e) => {
        e.preventDefault();
        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        addNode(data.type, data.label, x, y);
        renderTopology();
    });
}

/**
 * Event listener'ları başlatır
 */
function initializeEventListeners() {
    // Analiz butonu
    document.getElementById('btn-analyze').addEventListener('click', runAnalysis);
    
    // Senaryo simülasyonu
    document.getElementById('btn-simulate').addEventListener('click', runSimulation);
    
    // Senaryo yükleme
    document.getElementById('btn-load-scenario').addEventListener('click', loadScenario);
    
    // SVG export
    document.getElementById('btn-export-svg').addEventListener('click', exportSVG);
    
    // STRIDE overlay toggle
    document.getElementById('stride-overlay').addEventListener('change', () => {
        renderTopology();
    });
    
    // Veri kaynağı butonları
    document.querySelectorAll('.btn-source').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-source').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            addLog(`Veri kaynağı seçildi: ${btn.dataset.source.toUpperCase()}`, 'success');
        });
    });
    
    // Modal kapatma
    document.querySelector('.modal-close').addEventListener('click', () => {
        document.getElementById('node-modal').style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('node-modal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// ==================== TOPOLOGY MANAGEMENT ====================

/**
 * Varsayılan topolojiyi yükler (Internet → Web Sunucusu → DB Sunucusu, Yönetici PC)
 */
function loadDefaultTopology() {
    topology.nodes = [
        { id: 'internet', type: 'internet', label: 'Internet', x: 100, y: 100, cves: [], properties: { os: 'N/A', services: [] } },
        { id: 'web-server', type: 'server', label: 'Web Sunucusu', x: 300, y: 200, cves: mockCVE.server, properties: { os: 'Linux', services: ['Apache', 'PHP'], ports: [80, 443] } },
        { id: 'db-server', type: 'database', label: 'DB Sunucusu', x: 500, y: 300, cves: mockCVE.database, properties: { os: 'Linux', services: ['MySQL'], ports: [3306] } },
        { id: 'admin-pc', type: 'pc', label: 'Yönetici PC', x: 300, y: 400, cves: mockCVE.pc, properties: { os: 'Windows', services: ['RDP'], ports: [3389] } }
    ];
    
    topology.edges = [
        { from: 'internet', to: 'web-server', cost: 0, critical: true },
        { from: 'web-server', to: 'db-server', cost: 0, critical: true },
        { from: 'admin-pc', to: 'web-server', cost: 0, critical: false }
    ];
    
    // Kenar maliyetlerini hesapla
    calculateEdgeCosts();
}

/**
 * Senaryo topolojilerini yükler
 */
function loadScenario() {
    const scenario = document.getElementById('scenario-select').value;
    
    switch(scenario) {
        case 'simple':
            loadSimpleTopology();
            break;
        case 'dmz':
            loadDMZTopology();
            break;
        case 'iot':
            loadIoTTopology();
            break;
        default:
            loadDefaultTopology();
    }
    
    renderTopology();
    addLog(`Senaryo yüklendi: ${document.getElementById('scenario-select').selectedOptions[0].text}`, 'success');
}

/**
 * Basit üç katmanlı topoloji
 */
function loadSimpleTopology() {
    topology.nodes = [
        { id: 'internet', type: 'internet', label: 'Internet', x: 150, y: 150, cves: [], properties: {} },
        { id: 'web', type: 'server', label: 'Web Katmanı', x: 400, y: 200, cves: mockCVE.server, properties: { os: 'Linux' } },
        { id: 'app', type: 'server', label: 'Uygulama Katmanı', x: 400, y: 300, cves: mockCVE.server, properties: { os: 'Linux' } },
        { id: 'db', type: 'database', label: 'Veritabanı Katmanı', x: 400, y: 400, cves: mockCVE.database, properties: { os: 'Linux' } }
    ];
    
    topology.edges = [
        { from: 'internet', to: 'web', cost: 0, critical: true },
        { from: 'web', to: 'app', cost: 0, critical: true },
        { from: 'app', to: 'db', cost: 0, critical: true }
    ];
    
    calculateEdgeCosts();
}

/**
 * DMZ örneği topoloji
 */
function loadDMZTopology() {
    topology.nodes = [
        { id: 'internet', type: 'internet', label: 'Internet', x: 100, y: 250, cves: [], properties: {} },
        { id: 'firewall', type: 'firewall', label: 'Güvenlik Duvarı', x: 250, y: 250, cves: mockCVE.firewall, properties: {} },
        { id: 'dmz-web', type: 'server', label: 'DMZ Web', x: 400, y: 150, cves: mockCVE.server, properties: { os: 'Linux' } },
        { id: 'internal-web', type: 'server', label: 'İç Web', x: 400, y: 250, cves: mockCVE.server, properties: { os: 'Linux' } },
        { id: 'db', type: 'database', label: 'Veritabanı', x: 400, y: 350, cves: mockCVE.database, properties: { os: 'Linux' } }
    ];
    
    topology.edges = [
        { from: 'internet', to: 'firewall', cost: 0, critical: false },
        { from: 'firewall', to: 'dmz-web', cost: 0, critical: true },
        { from: 'dmz-web', to: 'internal-web', cost: 0, critical: true },
        { from: 'internal-web', to: 'db', cost: 0, critical: true }
    ];
    
    calculateEdgeCosts();
}

/**
 * IoT yoğun örnek topoloji
 */
function loadIoTTopology() {
    topology.nodes = [
        { id: 'internet', type: 'internet', label: 'Internet', x: 150, y: 200, cves: [], properties: {} },
        { id: 'router', type: 'router', label: 'Router', x: 300, y: 200, cves: mockCVE.router, properties: {} },
        { id: 'iot1', type: 'iot', label: 'IoT Kamera 1', x: 450, y: 100, cves: mockCVE.iot, properties: {} },
        { id: 'iot2', type: 'iot', label: 'IoT Kamera 2', x: 450, y: 200, cves: mockCVE.iot, properties: {} },
        { id: 'iot3', type: 'iot', label: 'IoT Sensör', x: 450, y: 300, cves: mockCVE.iot, properties: {} },
        { id: 'server', type: 'server', label: 'IoT Sunucusu', x: 300, y: 350, cves: mockCVE.server, properties: { os: 'Linux' } }
    ];
    
    topology.edges = [
        { from: 'internet', to: 'router', cost: 0, critical: true },
        { from: 'router', to: 'iot1', cost: 0, critical: false },
        { from: 'router', to: 'iot2', cost: 0, critical: false },
        { from: 'router', to: 'iot3', cost: 0, critical: false },
        { from: 'iot1', to: 'server', cost: 0, critical: true },
        { from: 'iot2', to: 'server', cost: 0, critical: true },
        { from: 'iot3', to: 'server', cost: 0, critical: true }
    ];
    
    calculateEdgeCosts();
}

/**
 * Yeni düğüm ekler
 */
function addNode(type, label, x, y) {
    const id = `${type}-${Date.now()}`;
    const node = {
        id,
        type,
        label,
        x,
        y,
        cves: mockCVE[type] || mockCVE.default,
        properties: {
            os: 'Bilinmiyor',
            services: [],
            ports: []
        }
    };
    
    topology.nodes.push(node);
    
    // Yeni düğüm eklendiğinde sağ panelde form açılabilir (şimdilik sadece log)
    addLog(`Yeni varlık eklendi: ${label}`, 'success');
    
    // Modal açılabilir
    showNodeDetails(node);
}

/**
 * Kenar maliyetlerini hesaplar
 * Formül: edge_cost = 10 - normalized_cvss
 * Bu formül, yüksek CVSS skorlu düğümler arası geçişi daha maliyetli yapar
 */
function calculateEdgeCosts() {
    topology.edges.forEach(edge => {
        const fromNode = topology.nodes.find(n => n.id === edge.from);
        const toNode = topology.nodes.find(n => n.id === edge.to);
        
        if (!fromNode || !toNode) {
            edge.cost = 10; // Varsayılan maliyet
            return;
        }
        
        // Her iki düğümün ortalama CVSS skorunu hesapla
        const fromAvgCVSS = calculateAverageCVSS(fromNode);
        const toAvgCVSS = calculateAverageCVSS(toNode);
        const avgCVSS = (fromAvgCVSS + toAvgCVSS) / 2;
        
        // Normalize edilmiş CVSS (0-10 arası)
        const normalizedCVSS = Math.min(10, Math.max(0, avgCVSS));
        
        // Kenar maliyeti: yüksek CVSS = düşük maliyet (daha riskli yol)
        // Ancak Dijkstra için düşük maliyet = kısa yol olduğundan,
        // riski maliyete çevirmek için: cost = 10 - normalized_cvss
        // Böylece yüksek riskli yol, düşük maliyetli (tercih edilen) yol olur
        edge.cost = Math.max(0.1, 10 - normalizedCVSS);
    });
}

/**
 * Düğümün ortalama CVSS skorunu hesaplar
 */
function calculateAverageCVSS(node) {
    if (!node.cves || node.cves.length === 0) return 0;
    const sum = node.cves.reduce((acc, cve) => acc + cve.cvssScore, 0);
    return sum / node.cves.length;
}

// ==================== RENDERING ====================

/**
 * Topolojiyi SVG üzerinde render eder
 */
function renderTopology() {
    // SVG'yi temizle
    svg.innerHTML = '';
    
    // Kenarları çiz (düğümlerden önce, alt katmanda)
    topology.edges.forEach(edge => {
        const fromNode = topology.nodes.find(n => n.id === edge.from);
        const toNode = topology.nodes.find(n => n.id === edge.to);
        
        if (!fromNode || !toNode) return;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromNode.x);
        line.setAttribute('y1', fromNode.y);
        line.setAttribute('x2', toNode.x);
        line.setAttribute('y2', toNode.y);
        line.setAttribute('class', `topology-edge ${edge.critical ? 'critical' : ''}`);
        svg.appendChild(line);
    });
    
    // Düğümleri çiz
    topology.nodes.forEach(node => {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'topology-node');
        group.setAttribute('data-node-id', node.id);
        
        // Düğüm rengini risk seviyesine göre belirle
        const avgCVSS = calculateAverageCVSS(node);
        const color = getRiskColor(avgCVSS);
        
        // Düğüm çemberi
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', node.x);
        circle.setAttribute('cy', node.y);
        circle.setAttribute('r', 25);
        circle.setAttribute('fill', color);
        circle.setAttribute('stroke', '#2A2F3E');
        circle.setAttribute('stroke-width', 2);
        group.appendChild(circle);
        
        // Düğüm etiketi
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', node.x);
        text.setAttribute('y', node.y + 45);
        text.setAttribute('class', 'topology-node-label');
        text.textContent = node.label;
        group.appendChild(text);
        
        // STRIDE overlay (eğer aktifse)
        if (document.getElementById('stride-overlay').checked) {
            const stride = getSTRIDECategory(node);
            if (stride) {
                const badge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                badge.setAttribute('x', node.x);
                badge.setAttribute('y', node.y - 30);
                badge.setAttribute('class', 'stride-badge');
                badge.setAttribute('fill', STRIDE_COLORS[stride]);
                badge.textContent = stride;
                group.appendChild(badge);
            }
        }
        
        // Event listener'lar
        group.addEventListener('click', () => showNodeDetails(node));
        group.addEventListener('mousedown', (e) => startDrag(e, node));
        
        svg.appendChild(group);
    });
}

/**
 * Risk seviyesine göre renk döndürür (yeşil → kırmızı)
 */
function getRiskColor(cvssScore) {
    if (cvssScore === 0) return '#2A2F3E';
    
    // 0-10 arası CVSS skorunu 0-1 arası normalize et
    const normalized = cvssScore / 10;
    
    // Yeşil (#00FF88) → Kırmızı (#FF3B30) gradient
    const r1 = 0, g1 = 255, b1 = 136; // #00FF88
    const r2 = 255, g2 = 59, b2 = 48;  // #FF3B30
    
    const r = Math.round(r1 + (r2 - r1) * normalized);
    const g = Math.round(g1 + (g2 - g1) * normalized);
    const b = Math.round(b1 + (b2 - b1) * normalized);
    
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Düğüm için STRIDE kategorisini belirler (basit örnek)
 */
function getSTRIDECategory(node) {
    const avgCVSS = calculateAverageCVSS(node);
    if (avgCVSS >= 9) return 'E'; // Elevation of Privilege
    if (avgCVSS >= 7) return 'I'; // Information Disclosure
    if (avgCVSS >= 5) return 'D'; // Denial of Service
    return null;
}

// ==================== DRAG AND DROP ====================

/**
 * Düğüm sürükleme başlatır
 */
function startDrag(e, node) {
    selectedNode = node;
    isDragging = true;
    const rect = svg.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left - node.x;
    dragOffset.y = e.clientY - rect.top - node.y;
    
    svg.addEventListener('mousemove', onDrag);
    svg.addEventListener('mouseup', stopDrag);
    svg.addEventListener('mouseleave', stopDrag);
}

/**
 * Düğüm sürükleme işlemi
 */
function onDrag(e) {
    if (!isDragging || !selectedNode) return;
    
    const rect = svg.getBoundingClientRect();
    selectedNode.x = e.clientX - rect.left - dragOffset.x;
    selectedNode.y = e.clientY - rect.top - dragOffset.y;
    
    // Sınırları kontrol et
    selectedNode.x = Math.max(25, Math.min(svgWidth - 25, selectedNode.x));
    selectedNode.y = Math.max(25, Math.min(svgHeight - 25, selectedNode.y));
    
    renderTopology();
}

/**
 * Düğüm sürükleme durdurur
 */
function stopDrag() {
    isDragging = false;
    selectedNode = null;
    svg.removeEventListener('mousemove', onDrag);
    svg.removeEventListener('mouseup', stopDrag);
    svg.removeEventListener('mouseleave', stopDrag);
}

// ==================== NODE DETAILS MODAL ====================

/**
 * Düğüm detaylarını modal'da gösterir
 */
function showNodeDetails(node) {
    const modal = document.getElementById('node-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modalTitle.textContent = node.label;
    
    let html = `
        <div class="node-properties">
            <div class="property-item">
                <span class="property-label">Tip:</span>
                <span class="property-value">${node.type}</span>
            </div>
            <div class="property-item">
                <span class="property-label">Ortalama CVSS:</span>
                <span class="property-value">${calculateAverageCVSS(node).toFixed(2)}</span>
            </div>
            <div class="property-item">
                <span class="property-label">CVE Sayısı:</span>
                <span class="property-value">${node.cves.length}</span>
            </div>
    `;
    
    if (node.properties.os) {
        html += `
            <div class="property-item">
                <span class="property-label">İşletim Sistemi:</span>
                <span class="property-value">${node.properties.os}</span>
            </div>
        `;
    }
    
    if (node.properties.services && node.properties.services.length > 0) {
        html += `
            <div class="property-item">
                <span class="property-label">Servisler:</span>
                <span class="property-value">${node.properties.services.join(', ')}</span>
            </div>
        `;
    }
    
    html += `</div>`;
    
    // CVE listesi
    if (node.cves && node.cves.length > 0) {
        html += `<div class="cve-list"><h3>CVE Listesi</h3>`;
        node.cves.forEach(cve => {
            const isCritical = cve.cvssScore >= 9;
            html += `
                <div class="cve-item ${isCritical ? 'critical' : ''}">
                    <div class="cve-id">
                        ${cve.id}
                        <span class="cve-score">CVSS: ${cve.cvssScore}</span>
                    </div>
                    <div class="cve-description">${cve.description}</div>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    modalBody.innerHTML = html;
    modal.style.display = 'block';
}

// ==================== ANALYSIS ALGORITHMS ====================

/**
 * Ana analiz fonksiyonu - Dijkstra algoritmasını çalıştırır
 */
function runAnalysis() {
    addLog('=== Analiz Başlatıldı ===', 'success');
    addLog('CVSS skorları hesaplanıyor...', '');
    
    // Kenar maliyetlerini güncelle
    calculateEdgeCosts();
    
    // Internet düğümünü kaynak olarak al
    const sourceNode = topology.nodes.find(n => n.type === 'internet');
    if (!sourceNode) {
        addLog('Hata: Internet düğümü bulunamadı', 'error');
        return;
    }
    
    // Algoritma seçimi
    const algorithm = document.getElementById('algorithm-select').value;
    
    let result;
    switch(algorithm) {
        case 'dijkstra':
            result = dijkstra(sourceNode.id);
            break;
        case 'dfs':
            result = findAllPathsDFS(sourceNode.id);
            break;
        default:
            result = dijkstra(sourceNode.id);
    }
    
    // Sonuçları göster
    displayAnalysisResults(result);
    
    // Kritik yolu vurgula
    highlightCriticalPath(result.path);
}

/**
 * Dijkstra algoritması - En kısa (en riskli) yolu bulur
 * 
 * Bu implementasyon, grafikteki en düşük maliyetli yolu bulur.
 * Kenar maliyeti = 10 - normalized_cvss formülü kullanıldığından,
 * yüksek riskli yollar düşük maliyetli olur ve Dijkstra bunları tercih eder.
 */
function dijkstra(sourceId) {
    addLog(`Dijkstra: Başlangıç düğümü: ${sourceId}`, '');
    
    const distances = {};
    const previous = {};
    const unvisited = new Set();
    
    // Başlangıç değerleri
    topology.nodes.forEach(node => {
        distances[node.id] = Infinity;
        previous[node.id] = null;
        unvisited.add(node.id);
    });
    distances[sourceId] = 0;
    
    // Ana döngü
    while (unvisited.size > 0) {
        // En küçük mesafeli düğümü bul
        let current = null;
        let minDistance = Infinity;
        
        unvisited.forEach(nodeId => {
            if (distances[nodeId] < minDistance) {
                minDistance = distances[nodeId];
                current = nodeId;
            }
        });
        
        if (current === null || minDistance === Infinity) break;
        
        unvisited.delete(current);
        addLog(`Dijkstra: Düğüm ${current} işleniyor (mesafe: ${minDistance.toFixed(2)})`, '');
        
        // Komşuları kontrol et
        topology.edges.forEach(edge => {
            if (edge.from === current && unvisited.has(edge.to)) {
                const alt = distances[current] + edge.cost;
                if (alt < distances[edge.to]) {
                    distances[edge.to] = alt;
                    previous[edge.to] = current;
                }
            }
        });
    }
    
    // En yüksek riskli hedefi bul (en yüksek CVSS'li düğüm)
    let targetNode = null;
    let maxCVSS = 0;
    
    topology.nodes.forEach(node => {
        if (node.type === 'internet') return;
        const avgCVSS = calculateAverageCVSS(node);
        if (avgCVSS > maxCVSS && distances[node.id] < Infinity) {
            maxCVSS = avgCVSS;
            targetNode = node;
        }
    });
    
    if (!targetNode) {
        addLog('Hata: Hedef düğüm bulunamadı', 'error');
        return { path: [], cost: 0, score: 0 };
    }
    
    // Yolu geri oluştur
    const path = [];
    let current = targetNode.id;
    while (current !== null) {
        path.unshift(current);
        current = previous[current];
    }
    
    const totalCost = distances[targetNode.id];
    addLog(`Dijkstra: En riskli yol bulundu (maliyet: ${totalCost.toFixed(2)})`, 'success');
    addLog(`Dijkstra: Yol: ${path.join(' → ')}`, 'success');
    
    return {
        path,
        cost: totalCost,
        target: targetNode.id,
        targetCVSS: maxCVSS
    };
}

/**
 * DFS (Derinlik Öncelikli Arama) - Tüm yolları bulur
 */
function findAllPathsDFS(sourceId) {
    addLog(`DFS: Tüm yollar aranıyor (kaynak: ${sourceId})`, '');
    
    const paths = [];
    const visited = new Set();
    
    function dfs(current, target, path, totalCost) {
        if (current === target) {
            paths.push({
                path: [...path],
                cost: totalCost
            });
            return;
        }
        
        visited.add(current);
        
        topology.edges.forEach(edge => {
            if (edge.from === current && !visited.has(edge.to)) {
                path.push(edge.to);
                dfs(edge.to, target, path, totalCost + edge.cost);
                path.pop();
            }
        });
        
        visited.delete(current);
    }
    
    // Her hedef düğüm için yol bul
    topology.nodes.forEach(node => {
        if (node.id !== sourceId && node.type !== 'internet') {
            dfs(sourceId, node.id, [sourceId], 0);
        }
    });
    
    // En riskli yolu seç (en düşük maliyet = en yüksek risk)
    if (paths.length === 0) {
        addLog('DFS: Hiç yol bulunamadı', 'error');
        return { path: [], cost: 0, score: 0 };
    }
    
    paths.sort((a, b) => a.cost - b.cost);
    const bestPath = paths[0];
    
    addLog(`DFS: ${paths.length} yol bulundu`, 'success');
    addLog(`DFS: En riskli yol: ${bestPath.path.join(' → ')}`, 'success');
    
    return {
        path: bestPath.path,
        cost: bestPath.cost,
        allPaths: paths
    };
}

// ==================== RESULTS DISPLAY ====================

/**
 * Analiz sonuçlarını gösterir
 */
function displayAnalysisResults(result) {
    // Genel sistem skoru hesapla
    let totalCVSS = 0;
    let totalCVE = 0;
    
    topology.nodes.forEach(node => {
        if (node.type !== 'internet') {
            totalCVSS += calculateAverageCVSS(node);
            totalCVE += node.cves.length;
        }
    });
    
    const systemScore = totalCVSS / (topology.nodes.length - 1); // Internet hariç
    const systemScoreNormalized = (systemScore / 10) * 100; // Yüzde olarak
    
    // UI'yi güncelle
    document.getElementById('system-score').textContent = `${systemScore.toFixed(2)} / 10.0 (${systemScoreNormalized.toFixed(1)}%)`;
    document.getElementById('total-cve').textContent = totalCVE.toString();
    document.getElementById('last-update').textContent = new Date().toLocaleString('tr-TR');
    
    // Saldırı yolu
    if (result.path && result.path.length > 0) {
        const pathLabels = result.path.map(id => {
            const node = topology.nodes.find(n => n.id === id);
            return node ? node.label : id;
        });
        document.getElementById('attack-path').textContent = pathLabels.join(' → ');
    } else {
        document.getElementById('attack-path').textContent = 'Yol bulunamadı';
    }
}

/**
 * Kritik yolu vurgular
 */
function highlightCriticalPath(path) {
    // Tüm kenarları normal yap
    topology.edges.forEach(edge => {
        edge.critical = false;
    });
    
    // Yol üzerindeki kenarları kritik yap
    for (let i = 0; i < path.length - 1; i++) {
        const edge = topology.edges.find(e => e.from === path[i] && e.to === path[i + 1]);
        if (edge) {
            edge.critical = true;
        }
    }
    
    renderTopology();
}

// ==================== SIMULATION ====================

/**
 * Senaryo simülasyonunu çalıştırır
 */
function runSimulation() {
    const scenario = document.getElementById('simulation-select').value;
    
    if (!scenario) {
        addLog('Lütfen bir senaryo seçin', 'error');
        return;
    }
    
    addLog(`=== Simülasyon Başlatıldı: ${scenario} ===`, 'success');
    
    switch(scenario) {
        case 'firewall-off':
            simulateFirewallOff();
            break;
        case 'patch-applied':
            simulatePatchApplied();
            break;
        case 'new-vulnerability':
            simulateNewVulnerability();
            break;
    }
    
    // Analizi tekrar çalıştır
    setTimeout(() => {
        runAnalysis();
        addLog('Simülasyon sonrası analiz tamamlandı', 'success');
    }, 500);
}

/**
 * Güvenlik duvarı kapalı simülasyonu
 */
function simulateFirewallOff() {
    const firewall = topology.nodes.find(n => n.type === 'firewall');
    if (firewall) {
        // Güvenlik duvarı düğümüne yüksek riskli CVE ekle
        firewall.cves.push({
            id: 'CVE-SIM-001',
            cvssScore: 9.5,
            description: 'Güvenlik duvarı devre dışı - Tüm trafik açık'
        });
        addLog('Güvenlik duvarı devre dışı bırakıldı', 'error');
    } else {
        // Güvenlik duvarı yoksa, tüm kenarları daha riskli yap
        topology.edges.forEach(edge => {
            edge.cost = Math.max(0.1, edge.cost * 0.5); // Maliyeti yarıya indir (daha riskli)
        });
        addLog('Tüm bağlantılar daha riskli hale getirildi', 'error');
    }
}

/**
 * Yama uygulandı simülasyonu
 */
function simulatePatchApplied() {
    // Rastgele bir düğüm seç ve CVE'lerini azalt
    const vulnerableNodes = topology.nodes.filter(n => n.cves.length > 0 && n.type !== 'internet');
    if (vulnerableNodes.length > 0) {
        const node = vulnerableNodes[Math.floor(Math.random() * vulnerableNodes.length)];
        node.cves = node.cves.filter(cve => cve.cvssScore < 7); // Yüksek riskli CVE'leri kaldır
        addLog(`${node.label} için yama uygulandı - Yüksek riskli CVE'ler kaldırıldı`, 'success');
    }
}

/**
 * Yeni zafiyet tespit edildi simülasyonu
 */
function simulateNewVulnerability() {
    const vulnerableNodes = topology.nodes.filter(n => n.type !== 'internet');
    if (vulnerableNodes.length > 0) {
        const node = vulnerableNodes[Math.floor(Math.random() * vulnerableNodes.length)];
        node.cves.push({
            id: `CVE-SIM-${Date.now()}`,
            cvssScore: 8.5 + Math.random() * 1.5, // 8.5-10 arası
            description: 'Yeni tespit edilen kritik zafiyet'
        });
        addLog(`${node.label} için yeni kritik zafiyet tespit edildi`, 'error');
    }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Log paneline mesaj ekler
 */
function addLog(message, type = '') {
    const logPanel = document.getElementById('log-panel');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString('tr-TR')}] ${message}`;
    logPanel.appendChild(entry);
    logPanel.scrollTop = logPanel.scrollHeight;
}

/**
 * SVG'yi dışa aktarır
 */
function exportSVG() {
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `topology-${Date.now()}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    addLog('SVG dışa aktarıldı', 'success');
}

// ==================== API INTEGRATION PLACEHOLDERS ====================

/**
 * CVE verilerini NVD API'den çeker (PLACEHOLDER)
 * 
 * Gerçek implementasyon için:
 * 1. NVD API endpoint: https://services.nvd.nist.gov/rest/json/cves/2.0
 * 2. CPE (Common Platform Enumeration) eşleştirmesi yapılmalı
 * 3. Rate limit: 5 istek/30 saniye (API key ile 50 istek/30 saniye)
 * 4. Caching mekanizması eklenmeli (localStorage veya backend cache)
 * 
 * Örnek API çağrısı:
 * fetch('https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=cpe:2.3:a:apache:http_server:2.4.41')
 *   .then(response => response.json())
 *   .then(data => {
 *     // CVE listesini işle
 *     return data.vulnerabilities.map(v => ({
 *       id: v.cve.id,
 *       cvssScore: v.cve.metrics.cvssMetricV31[0].cvssData.baseScore,
 *       description: v.cve.descriptions[0].value
 *     }));
 *   });
 */
async function fetchCVE(node) {
    // PLACEHOLDER: Şu anda mock veri döndürüyor
    // Gerçek implementasyonda NVD API çağrısı yapılacak
    
    addLog(`CVE verisi çekiliyor: ${node.label} (MOCK)`, '');
    
    // Simüle edilmiş API gecikmesi
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock veri döndür
    return mockCVE[node.type] || mockCVE.default;
}

/**
 * CPE eşleştirme fonksiyonu (PLACEHOLDER)
 * 
 * Gerçek implementasyonda:
 * - Cihaz özelliklerinden (OS, servis, versiyon) CPE string'i oluşturulmalı
 * - LLM veya pattern matching ile CPE normalizasyonu yapılabilir
 * - Örnek: "Linux Apache 2.4" → "cpe:2.3:a:apache:http_server:2.4.41"
 */
function matchCPE(node) {
    // PLACEHOLDER: Basit string matching
    const os = node.properties.os || '';
    const services = node.properties.services || [];
    
    // Bu kısım gerçek uygulamada daha sofistike olmalı
    // LLM veya CPE veritabanı kullanılabilir
    return `cpe:2.3:o:${os.toLowerCase()}:*:*:*`;
}


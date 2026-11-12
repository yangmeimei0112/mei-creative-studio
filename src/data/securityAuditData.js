/**
 * 咩創意工作室 (Mei Creative Studio) - 企業級資安事故清查與防禦矩陣數據
 * 標語：創意無限∞咩有極限
 * 規格：5 大清查面向、14 項關鍵威脅指標、完整排查要點、終端排查指令與應變提示 (Zero Emoji)
 */

export const SECURITY_AUDIT_DOMAINS = [
  {
    id: 'identity-access',
    title: '帳號與身分驗證',
    subtitle: 'Identity & Access',
    icon: 'user-check',
    badge: '驗證核心',
    description: '駭客入侵後通常會建立後門帳號或提升權限，以維持長期控制。',
    items: [
      {
        id: 'abnormal-logins',
        name: '異常登入紀錄',
        status: 'normal',
        statusText: '無異常登入',
        target: 'Active Directory (AD)、VPN、SSO、雲端後台 (AWS / GCP / M365)',
        checkpoints: '檢查 Active Directory (AD)、VPN、SSO 或雲端後台（如 AWS、GCP、M365），確認是否有非上班時間、異常地理位置（海外 IP）或短時間內大量失敗後成功的登入紀錄。',
        sampleLogs: [
          'SSO Audit: 過去 24 小時內登入來源皆為授權內網 IP (192.168.1.0/24)',
          'Cloud Console: 無非授權時段之後台 Root / Admin 登入請求',
          'VPN Gateway: 雙因子認證 (2FA) 覆蓋率 100%，無連續失敗跳板紀錄'
        ],
        queryCmd: 'az monitor activity-log list --status Failed | jq .',
        inspectTip: '定期過濾海外跳板 IP (Tor/VPN 節點) 與單一帳號短時間連續失敗後成功的密碼噴灑 (Password Spraying) 跡象。'
      },
      {
        id: 'privilege-escalation',
        name: '新增與提權帳號',
        status: 'normal',
        statusText: '無未授權提權',
        target: 'Administrator、Domain Admins、Root、Sudoers 高權限群組',
        checkpoints: '清查近期是否出現不明的新增帳號，或一般使用者帳號被無故加入 Administrator、Domain Admins 等高權限群組。',
        sampleLogs: [
          'IAM Audit: 管理員群組成員名冊固定，近期無不明新增帳號',
          'Domain Controller: Event ID 4720 (帳號建立) 近期檢驗合規',
          'Sudoers: 檔案校驗雜湊比對一致 (SHA-256 Verified)'
        ],
        queryCmd: 'net localgroup Administrators && grep -Po "^sudo:.*$" /etc/group',
        inspectTip: '若發現幽靈帳號 (Ghost Account) 或影子管理員，應立即凍結憑證並調閱建立時間點之 Audit 日誌。'
      },
      {
        id: 'api-keys-certs',
        name: 'API 金鑰與憑證',
        status: 'normal',
        statusText: '憑證盤點合規',
        target: 'API Token、Service Account、SSH Key、TLS/SSL 憑證',
        checkpoints: '檢查是否有異常建立的 API Token、Service Account 或 SSH Key。',
        sampleLogs: [
          'Service Account: 僅存受控服務金鑰，最近輪替時間在合規週期內',
          'SSH authorized_keys: 僅包含已簽名受信任公鑰，無額外植入金鑰',
          'Repo Secret Scanning: 無硬編碼私鑰或未受控 Token 外洩警告'
        ],
        queryCmd: 'cat ~/.ssh/authorized_keys && gcloud iam service-accounts keys list',
        inspectTip: '嚴格落實金鑰最小權限原則 (PoLP) 與定期輪替，禁止明文暴露於代碼儲存庫中。'
      }
    ]
  },
  {
    id: 'network-traffic',
    title: '網路連線與流量',
    subtitle: 'Network Traffic',
    icon: 'globe',
    badge: '邊界防護',
    description: '透過網路紀錄可判斷是否有資料正在外洩，或內部主機正與駭客的指揮控制伺服器（C2）連線。',
    items: [
      {
        id: 'abnormal-outbound',
        name: '異常對外連線',
        status: 'normal',
        statusText: '無可疑 C2 連線',
        target: '防火牆 (Firewall)、Proxy、DNS 查詢日誌',
        checkpoints: '調閱防火牆（Firewall）、Proxy 與 DNS 查詢日誌，尋找連向陌生海外 IP、高風險網域或使用非標準通訊埠（Port）的流量。',
        sampleLogs: [
          'DNS Resolver: 無命中威脅情資 (Threat Intel) 惡意 C2 網域黑名單',
          'Egress Firewall: 封鎖所有未經許可的高位非標準通訊埠 (Non-standard Ports)',
          'Proxy Access: 對外連線 SNI 域名皆與白名單企業服務吻合'
        ],
        queryCmd: 'netstat -ano | findstr ESTABLISHED || ss -tunap | grep ESTAB',
        inspectTip: '關注罕見動態 DNS (DDNS)、新註冊域名 (NRD) 以及高頻規律心跳封包 (Beaconing) 之連線週期。'
      },
      {
        id: 'massive-data-transfer',
        name: '大量資料傳輸',
        status: 'normal',
        statusText: '傳輸峰值正常',
        target: '核心資料庫伺服器、內部檔案儲存庫、外送封包流量',
        checkpoints: '觀察內部伺服器是否有在非備份時段，向外傳送異常龐大封包的紀錄。',
        sampleLogs: [
          'Bandwidth Monitor: 上傳流量維持在基準線以下 (< 1.2 MB/s)',
          'Egress Meter: 非備份窗口無異常 GB 級大型資料封包外送紀錄',
          'DLP Engine: 無批次壓縮檔 (.zip, .7z) 對外連線傳輸跡象'
        ],
        queryCmd: 'vnstat -h 24 || iftop -t -s 10 -L 10',
        inspectTip: '攻擊者往往利用 rclone、MegaCMD 或自建暗網跳板進行多執行緒資料暗中外洩 (Data Exfiltration)。'
      },
      {
        id: 'lateral-movement',
        name: '橫向移動跡象',
        status: 'normal',
        statusText: '無內網橫向蔓延',
        target: '遠端桌面 (RDP)、SMB 檔案共享、SSH 掃描行為',
        checkpoints: '檢查內網主機之間是否有異常的遠端桌面（RDP）、SMB 檔案共享或 SSH 掃描行為，確認攻擊是否已擴散至其他機器。',
        sampleLogs: [
          'IDS Monitor: 內網網段無 SMB (Port 445) 或 RDP (Port 3389) 批次掃描',
          'Authentication Log: 無異常 Pass-the-Hash 或票據重送登入行為',
          'Host Firewall: 內部節點嚴格落實微隔離 (Zero Trust Micro-segmentation)'
        ],
        queryCmd: 'Get-WinEvent -FilterHashtable @{LogName="Security";Id=4624,4648} -MaxEvents 50',
        inspectTip: '留意內網主機向多個相鄰 IP 發起 WMI (135) 或 WinRM (5985) 連線，此為常見之橫向擴散特徵。'
      }
    ]
  },
  {
    id: 'endpoint-host',
    title: '端點與伺服器系統',
    subtitle: 'Endpoint & Host',
    icon: 'server',
    badge: '系統核心',
    description: '針對疑似受害的個人電腦或伺服器，需深入檢查系統底層的執行狀態。',
    items: [
      {
        id: 'background-processes',
        name: '背景處理程序（Processes）',
        status: 'normal',
        statusText: '系統程序健康',
        target: '系統處理程序、CPU/記憶體異常佔用行程、可疑偽裝程式',
        checkpoints: '檢查是否有偽裝成系統程式（如 svchost.exe 拼字微調或路徑異常）的可疑執行檔，以及 CPU 或記憶體佔用異常高的程序。',
        sampleLogs: [
          'Process Tree: svchost.exe 全數位於 System32 目錄且通過官方數位簽章驗證',
          'Resource Monitor: 無佔用 90% 以上 CPU 之未識別挖礦/加密行程',
          'Parent-Child Process: 無腳本直調未經授權之二進位檔案'
        ],
        queryCmd: 'wmic process get ProcessId,CommandLine,ParentProcessId,ExecutablePath',
        inspectTip: '留意 svch0st.exe、scvhost.exe 等同形偽裝字，以及執行路徑位於 AppData、Temp 等暫存目錄之二進位檔。'
      },
      {
        id: 'persistence-mechanisms',
        name: '持久化機制（Persistence）',
        status: 'normal',
        statusText: '無惡意排程後門',
        target: '工作排程器、登入檔 (Registry Run Keys)、系統服務、crontab、systemd',
        checkpoints: '駭客常透過排程確保重開機後仍能執行惡意程式。需檢查 Windows 的工作排程器、登入檔（Registry Run Keys）、系統服務（Services），或 Linux 的 crontab 與 systemd。',
        sampleLogs: [
          'Windows Task Scheduler: 近期無不明外部排程任務建立',
          'Registry Run Keys: HKLM/HKCU 啟動項目清查完畢，無異常執行引數',
          'Linux Daemons: /etc/systemd/system/ 與 crontab 雜湊校驗無變更'
        ],
        queryCmd: 'schtasks /query /fo LIST /v || ls -la /etc/cron* /etc/systemd/system',
        inspectTip: '排查自啟動項目是否具有無簽名、執行參數混淆 (Base64/PowerShell -enc) 之惡意留存特徵。'
      },
      {
        id: 'recently-modified-files',
        name: '近期變更檔案',
        status: 'normal',
        statusText: '檔案完整性一致',
        target: '網頁伺服器目錄、Webshell (.php, .jsp, .aspx)、大量新加密檔案',
        checkpoints: '搜尋近期被新增、修改或加密的檔案，特別留意網頁伺服器目錄下是否被植入 Webshell（如 .php、.jsp、.aspx 後門腳本）。',
        sampleLogs: [
          'Web Root: 網頁根目錄無未經核可之 .php / .jsp / .aspx 後門腳本',
          'File Integrity (FIM): 核心原始碼校驗雜湊與 Git 發布版本 100% 吻合',
          'Ransomware Defense: 未發現大量檔名帶有隨機副檔名或勒索說明文件'
        ],
        queryCmd: 'find /var/www/html -mtime -7 -type f \\( -name "*.php" -o -name "*.jsp" -o -name "*.aspx" \\)',
        inspectTip: '針對網頁上傳目錄 (/uploads, /media) 設置禁止腳本執行 (Noexec) 與防寫入保護。'
      }
    ]
  },
  {
    id: 'application-db-logs',
    title: '應用程式與資料庫日誌',
    subtitle: 'Application & DB Logs',
    icon: 'database',
    badge: '應用層安全',
    description: '若疑慮源自對外服務（如官網、電商平台或 API），需從應用層尋找攻擊入口。',
    items: [
      {
        id: 'web-access-logs',
        name: '網頁存取日誌（Web Access Logs）',
        status: 'normal',
        statusText: 'WAF 監控運作中',
        target: 'Nginx / Apache / IIS 存取紀錄、WAF 阻絕事件',
        checkpoints: '檢視 Nginx、Apache 或 IIS 的日誌，尋找 SQL Injection（SQL 隱碼攻擊）、XSS、路徑遍歷（../）或大量掃描特定路徑的異常請求。',
        sampleLogs: [
          'Edge WAF: 自動阻絕 SQL Injection (`UNION SELECT`, `1=1`) 嘗試',
          'Path Traversal: 阻擋含 `../../etc/passwd` 之惡意探針請求',
          'URI Scanner Filter: 封鎖對 `/admin.php`, `/wp-login.php`, `/.env` 之批次探針'
        ],
        queryCmd: 'grep -Ei "select|union|script|\\.\\./" /var/log/nginx/access.log | head -n 30',
        inspectTip: '利用自動化日誌分析器即時關聯同一 IP 的探針密度，超過臨界值自動啟動邊緣 IP 速率限制。'
      },
      {
        id: 'database-audit-logs',
        name: '資料庫操作紀錄',
        status: 'normal',
        statusText: 'Audit Log 正常',
        target: '資料庫 Audit Log、高權限指令、DROP 表格、SELECT * 大量匯出',
        checkpoints: '檢查資料庫的 Audit Log，確認是否有異常的 SELECT * 大量匯出、資料表遭刪除（DROP）或權限變更紀錄。',
        sampleLogs: [
          'DB Audit: 近期無批次 DROP TABLE、TRUNCATE 或 ALTER USER 提權指令',
          'Export Monitor: 無超過萬筆以上之全表未分頁巨量匯出紀錄',
          'Connection Pool: 應用層直連帳號權限已限制為最小必要 CRUD'
        ],
        queryCmd: 'SELECT event_time, user_host, argument FROM mysql.general_log WHERE argument LIKE "%DROP%" LIMIT 20;',
        inspectTip: '敏感資料表必須實施欄位層級加鹽雜湊與加密，並對大量查詢設定慢速日誌與警告閥值。'
      },
      {
        id: 'third-party-cve',
        name: '第三方套件與版本',
        status: 'normal',
        statusText: '0 重大 CVE 漏洞',
        target: '開源元件、npm / pip 套件相依性、執行環境框架',
        checkpoints: '盤點系統使用的開源元件或框架，確認是否暴露於近期公開的重大漏洞（CVE）之中。',
        sampleLogs: [
          'Dependency Check: 生產環境相依套件 0 Critical / 0 High 嚴重安全弱點',
          'Software Bill of Materials (SBOM): 已列冊並納入持續依賴性掃描',
          'Base Image / OS: 套用最新安全修正更新 (Security Patch Applied)'
        ],
        queryCmd: 'npm audit --production || pip-audit || trivy fs --scanners vuln .',
        inspectTip: '定期執行 SCA (軟體組成分析) 與依賴性安全檢測，防範開源供應鏈投毒與 Log4j 等遠端代碼執行 (RCE)。'
      }
    ]
  },
  {
    id: 'email-collaboration',
    title: '郵件與通訊軟體',
    subtitle: 'Email & Collaboration',
    icon: 'send',
    badge: '社交防禦',
    description: '社交工程與釣魚信件是企業最常見的入侵破口之一。',
    items: [
      {
        id: 'malicious-email-tracking',
        name: '惡意信件追蹤',
        status: 'normal',
        statusText: '郵件閘道防護中',
        target: '郵件閘道 (Mail Gateway)、可疑附件 (.zip, .iso, 巨集文件)、釣魚連結',
        checkpoints: '透過郵件閘道（Mail Gateway）清查是否有包含可疑附件（如 .zip、.iso、巨集文件）或釣魚連結的信件進入公司，並確認有哪些員工曾點擊或開啟。',
        sampleLogs: [
          'Mail Gateway (SPF/DKIM/DMARC): 假冒寄件者驗證全數封鎖 (100% Pass)',
          'Attachment Sandbox: 阻絕夾帶密碼保護 .zip 之釣魚發信測試',
          'Link Protection: URL 安全重寫沙盒防護已全面啟用'
        ],
        queryCmd: 'Get-MessageTrace -StartDate (Get-Date).AddDays(-7) -Status Quarantined | Select SenderAddress,Subject',
        inspectTip: '若發現員工誤點釣魚連結或執行惡意附件，應立即重設該員工憑證並對受害主機實施網路隔離。'
      },
      {
        id: 'mailbox-forwarding-rules',
        name: '信箱轉寄規則',
        status: 'normal',
        statusText: '無外部轉寄後門',
        target: '員工信箱 Inbox Rules、全域郵件傳送規則、轉寄至外部信箱',
        checkpoints: '檢查疑似受害員工的信箱設定，確認是否被惡意設定了「自動轉寄至外部信箱」的隱藏規則。',
        sampleLogs: [
          'Exchange / M365 Rule Audit: 全組織「轉寄至外部網域」規則維持禁制 (Disabled)',
          'Inbox Rules: 掃描 100% 員工信箱，未發現暗中轉移特定機密信件之後門設定',
          'Forwarding Alerts: 外部轉發即時告警系統全時待命'
        ],
        queryCmd: 'Get-Mailbox | Get-InboxRule | Where-Object { $_.ForwardTo -or $_.ForwardAsAttachmentTo }',
        inspectTip: '駭客常於攻破信箱後建立「自動刪除含 security/invoice 關鍵字並轉寄至外信箱」的隱藏過濾器。'
      }
    ]
  }
];

export function getSecurityAuditSummary() {
  const totalDomains = SECURITY_AUDIT_DOMAINS.length;
  let totalItems = 0;
  let normalCount = 0;

  for (const domain of SECURITY_AUDIT_DOMAINS) {
    for (const item of domain.items) {
      totalItems++;
      if (item.status === 'normal') {
        normalCount++;
      }
    }
  }

  return {
    totalDomains,
    totalItems,
    normalCount,
    complianceRate: Math.round((normalCount / totalItems) * 100)
  };
}

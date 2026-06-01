<?php

/**
 * RPN Конфигурационный Скрипт
 * 
 * Скорость: до 1 Гбит/с
 * Поддержка: V2Ray/Xray-клиенты (v2rayNG, v2rayN, V2Box, Sing-box, Streisand, FoxRay и др.)
 * Блокировка: FlClash (не путать с ClashX)
 */

// Определение User-Agent
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';

// Дополнительные заголовки для идентификации
$profileUpdate = $_SERVER['HTTP_PROFILE_UPDATE_INTERVAL'] ?? '';
$clientType = $_SERVER['HTTP_X_CLIENT_TYPE'] ?? '';

/**
 * Проверка на FlClash (блокировка)
 * FlClash часто использует специфичные заголовки или путь
 */
$isFlClash = false;

// Проверка User-Agent на FlClash
$flClashPatterns = [
    'flclash',
    'FlClash',
    'FLC',
    'flutter'
];

foreach ($flClashPatterns as $pattern) {
    if (str_contains($userAgent, $pattern)) {
        $isFlClash = true;
        break;
    }
}

// Проверка специфичных заголовков FlClash
$flClashHeaders = [
    'HTTP_X_FLCLASH',
    'HTTP_FLCLASH',
    'HTTP_X_REQUESTED_WITH' => 'flclash'
];

foreach ($flClashHeaders as $key => $value) {
    if (is_int($key)) {
        if (isset($_SERVER[$value])) {
            $isFlClash = true;
            break;
        }
    } else {
        if (isset($_SERVER[$key]) && str_contains($_SERVER[$key], $value)) {
            $isFlClash = true;
            break;
        }
    }
}

// Если это FlClash - отдаём 403
if ($isFlClash) {
    http_response_code(403);
    die('Access Denied: This client is not supported.');
}

/**
 * Расширенное определение V2Ray/Proxy клиентов
 */
$isV2RayClient = false;

// Стандартные V2Ray клиенты
$v2rayPatterns = [
    'v2ray', 'v2rayNG', 'v2rayN', 'V2Box', 'V2RayU', 'V2RayX',
    'Xray', 'XrayNG', 'sing-box', 'Sing-box', 'SFA', 'SFI',
    'Streisand', 'FoxRay', 'Husi', 'Hiddify', 'HiddifyNG',
    'Matsuri', 'v2rayA', 'Qv2ray', 'Nekobox', 'Nekoray',
    'Shadowrocket', 'Quantumult', 'Quantumult X', 'Surge',
    'Loon', 'Stash', 'Egern', 'HttpClient', 'Dart',
    'okhttp', 'curl', 'wget', 'python-requests', 'Go-http-client',
    'Karing', 'Hiddify-Next', 'MahsaNG', 'NapsternetV',
    'Tunsafe', 'WireGuard', 'Amnezia', 'AmneziaWG',
    'Outline', 'NetMod', 'HTTPBot', 'TLSClient',
    'Docker-Client', 'containerd', 'cri-o'
];

foreach ($v2rayPatterns as $pattern) {
    if (str_contains(strtolower($userAgent), strtolower($pattern))) {
        $isV2RayClient = true;
        break;
    }
}

// Проверка по заголовкам профиля
if (
    !empty($profileUpdate) ||
    str_contains($userAgent, 'Profile-Update') ||
    isset($_SERVER['HTTP_SUBSCRIPTION_USERINFO'])
) {
    $isV2RayClient = true;
}

// Проверка по специфичным заголовкам
$v2rayHeaders = [
    'HTTP_X_V2RAY',
    'HTTP_XRAY',
    'HTTP_PROFILE_UPDATE_INTERVAL',
    'HTTP_SUBSCRIPTION_USERINFO',
    'HTTP_X_UI_CONFIG',
    'HTTP_X_CONFIG',
    'HTTP_X_PROXY',
    'HTTP_UPGRADE',
    'HTTP_SEC_WEBSOCKET_KEY'
];

foreach ($v2rayHeaders as $header) {
    if (isset($_SERVER[$header]) && !empty($_SERVER[$header])) {
        $isV2RayClient = true;
        break;
    }
}

/**
 * Если обнаружен V2Ray-клиент — отдаём конфигурацию
 */
if ($isV2RayClient) {
    header('Content-Type: application/json');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Заголовки для оптимизации скорости
    header('X-Accel-Buffering: no');
    header('Content-Encoding: gzip');

    // Конфигурация с улучшенными параметрами для скорости до 1 Гбит/с
    $config = [
        "mixed-port" => 7890,
        "socks-port" => 7891,
        "redir-port" => 7892,
        "allow-lan" => true,
        "mode" => "global",
        "log-level" => "warning",
        "external-controller" => "127.0.0.1:9090",
        "profile" => [
            "store-selected" => true,
            "store-fake-ip" => true
        ],
        "tun" => [
            "enable" => true,
            "stack" => "system",
            "auto-route" => true,
            "auto-detect-interface" => true,
            "dns-hijack" => [
                "any:53",
                "tcp://any:53"
            ]
        ],
        // Оптимизированный DNS для высокой скорости
        "dns" => [
            "enable" => true,
            "use-hosts" => true,
            "enhanced-mode" => "fake-ip",
            "fake-ip-range" => "198.18.0.1/16",
            "prefer-h3" => true,
            "use-system-hosts" => true,
            "default-nameserver" => [
                "1.1.1.1",
                "8.8.8.8",
                "9.9.9.9",
                "208.67.222.222"
            ],
            "nameserver" => [
                "https://dns.cloudflare.com/dns-query",
                "https://dns.google/dns-query",
                "1.1.1.1",
                "8.8.8.8"
            ],
            "fallback" => [
                "https://dns.quad9.net/dns-query",
                "https://doh.opendns.com/dns-query",
                "9.9.9.9",
                "208.67.222.222"
            ],
            "fallback-filter" => [
                "geoip" => true,
                "geoip-code" => "CN",
                "domain" => [
                    "+.googleapis.cn",
                    "+.gstatic.com"
                ]
            ],
            "fake-ip-filter" => [
                "*.lan",
                "*.localdomain",
                "*.example",
                "*.invalid",
                "*.localhost",
                "*.test",
                "*.local",
                "*.home.arpa",
                "time.*.com",
                "time.*.gov",
                "time.*.edu.cn",
                "ntp.*.com",
                "ntp.*.org",
                "*.ntp.org.cn",
                "*.openwrt.pool.ntp.org",
                "pool.ntp.org",
                "ntp.ubuntu.com",
                "time.*.apple.com",
                "time.*.google.com",
                "api.joox.com",
                "joox.com",
                "*.xiami.com",
                "*.msftconnecttest.com",
                "*.msftncsi.com",
                "+.xboxlive.com",
                "*.*.stun.playstation.net",
                "xbox.*.*.microsoft.com",
                "*.ipv6.microsoft.com",
                "speedtest.cros.wr.pvp.net",
                "stun.*.*.*",
                "stun.*.*",
                "+.stun.*.*",
                "+.stun.*.*.*",
                "+.stun.*.*.*.*"
            ]
        ],
        "proxies" => [
            [
                "name" => "🇵🇱 RPN / Польша 1",
                "type" => "vless",
                "server" => "37.139.35.95",
                "port" => 8443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "eh.vk.com",
                "reality-opts" => [
                    "public-key" => "3wa3ZmMniymkL-58bPtY7baWPxdJ6n2UaJMG7YiLiGo",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇵🇱 RPN / Польша 2",
                "type" => "vless",
                "server" => "191.44.113.215",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "dl.google.com",
                "reality-opts" => [
                    "public-key" => "kUTGAXlw5eEQQ1blZgVLFSUOMZvBa-1HAxVi7uiM9CY",
                    "short-id" => ""
                ],
                "client-fingerprint" => "firefox"
            ],
            [
                "name" => "🇩🇪 RPN / Германия 1 🚀",
                "type" => "vless",
                "server" => "109.71.245.204",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "okcdn.ru",
                "reality-opts" => [
                    "public-key" => "3wa3ZmMniymkL-58bPtY7baWPxdJ6n2UaJMG7YiLiGo",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇩🇪 RPN / Германия 2 🚀",
                "type" => "vless",
                "server" => "5.182.87.216",
                "port" => 443,
                "network" => "grpc",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "ne8wv6o6AYcQoVvz30PiTjSxviGa3_Kw5ClIEDdg-3A",
                    "short-id" => "6ba85179e30d4fc2"
                ],
                "grpc-opts" => [
                    "grpc-service-name" => "grpc"
                ],
                "client-fingerprint" => "firefox"
            ],
            [
                "name" => "🇩🇪 RPN / Германия 3 ⚡️",
                "type" => "vless",
                "server" => "5.83.129.141",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "NaONDf0qCoNVteBefVS25yLJbMMLdnKnwsu7_il9MXE",
                    "short-id" => ""
                ],
                "client-fingerprint" => "qq"
            ],
            [
                "name" => "🇱🇹 RPN / Литва",
                "type" => "vless",
                "server" => "144.31.243.148",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "dl.google.com",
                "reality-opts" => [
                    "public-key" => "3wa3ZmMniymkL-58bPtY7baWPxdJ6n2UaJMG7YiLiGo",
                    "short-id" => ""
                ],
                "client-fingerprint" => "firefox"
            ],
            [
                "name" => "🇳🇱 RPN / Нидерланды 2",
                "type" => "vless",
                "server" => "147.45.162.53",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "dl.google.com",
                "reality-opts" => [
                    "public-key" => "oGbQE8hz8cTrij4h9ystmsYa02Z70tbkes_CitR27Rc",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇳🇴 RPN / Норвегия",
                "type" => "vless",
                "server" => "144.31.217.142",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "dl.google.com",
                "reality-opts" => [
                    "public-key" => "3wa3ZmMniymkL-58bPtY7baWPxdJ6n2UaJMG7YiLiGo",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇧🇪 RPN / Бельгия",
                "type" => "vless",
                "server" => "109.107.189.15",
                "port" => 57371,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "dl.google.com",
                "reality-opts" => [
                    "public-key" => "3wa3ZmMniymkL-58bPtY7baWPxdJ6n2UaJMG7YiLiGo",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇨🇿 RPN / Чехия",
                "type" => "vless",
                "server" => "144.31.218.186",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "dl.google.com",
                "reality-opts" => [
                    "public-key" => "3wa3ZmMniymkL-58bPtY7baWPxdJ6n2UaJMG7YiLiGo",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇺🇸 RPN / США 1",
                "type" => "vless",
                "server" => "150.241.102.5",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "dl.google.com",
                "reality-opts" => [
                    "public-key" => "3wa3ZmMniymkL-58bPtY7baWPxdJ6n2UaJMG7YiLiGo",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇺🇸 RPN / США 2",
                "type" => "vless",
                "server" => "150.241.83.175",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "dl.google.com",
                "reality-opts" => [
                    "public-key" => "3wa3ZmMniymkL-58bPtY7baWPxdJ6n2UaJMG7YiLiGo",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇬🇧 RPN / Великобритания",
                "type" => "vless",
                "server" => "144.31.213.175",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "dl.google.com",
                "reality-opts" => [
                    "public-key" => "3wa3ZmMniymkL-58bPtY7baWPxdJ6n2UaJMG7YiLiGo",
                    "short-id" => ""
                ],
                "client-fingerprint" => "firefox"
            ],
            [
                "name" => "🇨🇦 RPN / Канада",
                "type" => "vless",
                "server" => "150.241.82.57",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "dl.google.com",
                "reality-opts" => [
                    "public-key" => "3wa3ZmMniymkL-58bPtY7baWPxdJ6n2UaJMG7YiLiGo",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇰🇿 RPN / Казахстан ЮТУБ без рекламы",
                "type" => "vless",
                "server" => "5.180.46.135",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "dl.google.com",
                "reality-opts" => [
                    "public-key" => "3wa3ZmMniymkL-58bPtY7baWPxdJ6n2UaJMG7YiLiGo",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇷🇺 RPN / РФ ТГ/ЮТУБ без рекламы",
                "type" => "vless",
                "server" => "37.139.35.95",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "eh.vk.com",
                "reality-opts" => [
                    "public-key" => "3wa3ZmMniymkL-58bPtY7baWPxdJ6n2UaJMG7YiLiGo",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇷🇺 RPN / РФ ОБХОД",
                "type" => "vless",
                "server" => "94.131.121.189",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "qS6DV_LiMuDvS6oS5VUMO41n6h3BNOy_Eg4YKXmyA2k",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇳🇱 RPN / Нидерланды ОБХОД 🚀",
                "type" => "vless",
                "server" => "46.8.210.16",
                "port" => 12443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "max.ru",
                "reality-opts" => [
                    "public-key" => "PSSON1yktUjcmg5bELmgoWr32y1VVlVXRyRV-opvhQk",
                    "short-id" => ""
                ],
                "client-fingerprint" => "firefox"
            ],
            [
                "name" => "🇵🇱 RPN / Польша ОБХОД 🚀",
                "type" => "vless",
                "server" => "46.8.210.16",
                "port" => 10443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "PSSON1yktUjcmg5bELmgoWr32y1VVlVXRyRV-opvhQk",
                    "short-id" => ""
                ],
                "client-fingerprint" => "firefox"
            ],
            [
                "name" => "🇵🇱 RPN / Польша 2 ОБХОД",
                "type" => "vless",
                "server" => "94.131.121.189",
                "port" => 8443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "PSSON1yktUjcmg5bELmgoWr32y1VVlVXRyRV-opvhQk",
                    "short-id" => ""
                ],
                "client-fingerprint" => "qq"
            ],
            [
                "name" => "🇩🇪 RPN / Германия ОБХОД",
                "type" => "vless",
                "server" => "158.160.246.28",
                "port" => 8443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "PSSON1yktUjcmg5bELmgoWr32y1VVlVXRyRV-opvhQk",
                    "short-id" => ""
                ],
                "client-fingerprint" => "firefox"
            ],
            [
                "name" => "🇩🇪 RPN / Германия 2 ОБХОД",
                "type" => "vless",
                "server" => "cdn.mirorclouds.xyz",
                "port" => 443,
                "network" => "ws",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "tls" => true,
                "servername" => "cdn.mirorclouds.xyz",
                "alpn" => [
                    "http/1.1"
                ],
                "ws-opts" => [
                    "path" => "/",
                    "headers" => [
                        "Host" => "cdn.mirorclouds.xyz"
                    ]
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇬🇧 RPN / ОБХОД 1 Мегафон,Т2,Yota",
                "type" => "vless",
                "server" => "194.59.40.181",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "NaONDf0qCoNVteBefVS25yLJbMMLdnKnwsu7_il9MXE",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇬🇧 RPN / ОБХОД 2 Билайн,Т2,Yota,Мег.",
                "type" => "vless",
                "server" => "91.245.226.177",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "NaONDf0qCoNVteBefVS25yLJbMMLdnKnwsu7_il9MXE",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇬🇧 RPN / ОБХОД 3 Мегафон,Билайн,Т2",
                "type" => "vless",
                "server" => "91.245.226.235",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "NaONDf0qCoNVteBefVS25yLJbMMLdnKnwsu7_il9MXE",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇬🇧 RPN / ОБХОД 4 Т2,Билайн,Yota",
                "type" => "vless",
                "server" => "194.59.40.180",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "NaONDf0qCoNVteBefVS25yLJbMMLdnKnwsu7_il9MXE",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇬🇧 RPN / ОБХОД 5 МТС,Т2,Yota",
                "type" => "vless",
                "server" => "91.245.226.113",
                "port" => 443,
                "network" => "tcp",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "flow" => "xtls-rprx-vision",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "NaONDf0qCoNVteBefVS25yLJbMMLdnKnwsu7_il9MXE",
                    "short-id" => ""
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇳🇱 RPN / Нидерланды ОБХОД 1",
                "type" => "vless",
                "server" => "46.182.24.123",
                "port" => 443,
                "network" => "grpc",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "ne8wv6o6AYcQoVvz30PiTjSxviGa3_Kw5ClIEDdg-3A",
                    "short-id" => "6ba85179e30d4fc2"
                ],
                "grpc-opts" => [
                    "grpc-service-name" => "grpc"
                ],
                "client-fingerprint" => "qq"
            ],
            [
                "name" => "🇳🇱 RPN / Нидерланды ОБХОД 2",
                "type" => "vless",
                "server" => "62.152.59.118",
                "port" => 443,
                "network" => "grpc",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "ne8wv6o6AYcQoVvz30PiTjSxviGa3_Kw5ClIEDdg-3A",
                    "short-id" => "6ba85179e30d4fc2"
                ],
                "grpc-opts" => [
                    "grpc-service-name" => "grpc"
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇳🇱 RPN / ОБХОД 3 Yota,Мегафон,Т2",
                "type" => "vless",
                "server" => "195.133.198.220",
                "port" => 443,
                "network" => "grpc",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "ne8wv6o6AYcQoVvz30PiTjSxviGa3_Kw5ClIEDdg-3A",
                    "short-id" => "6ba85179e30d4fc2"
                ],
                "grpc-opts" => [
                    "grpc-service-name" => "grpc"
                ],
                "client-fingerprint" => "qq"
            ],
            [
                "name" => "🇳🇱 RPN / ОБХОД 4 Т2,Мегафон,Билайн",
                "type" => "vless",
                "server" => "45.10.246.169",
                "port" => 443,
                "network" => "grpc",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "ne8wv6o6AYcQoVvz30PiTjSxviGa3_Kw5ClIEDdg-3A",
                    "short-id" => "6ba85179e30d4fc2"
                ],
                "grpc-opts" => [
                    "grpc-service-name" => "grpc"
                ],
                "client-fingerprint" => "qq"
            ],
            [
                "name" => "🇮🇹 RPN / Италия 🚀(WIFI) 2",
                "type" => "vless",
                "server" => "45.155.68.16",
                "port" => 443,
                "network" => "grpc",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "ne8wv6o6AYcQoVvz30PiTjSxviGa3_Kw5ClIEDdg-3A",
                    "short-id" => "6ba85179e30d4fc2"
                ],
                "grpc-opts" => [
                    "grpc-service-name" => "grpc"
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇹🇷 RPN / Турция",
                "type" => "vless",
                "server" => "193.187.132.145",
                "port" => 443,
                "network" => "grpc",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "ne8wv6o6AYcQoVvz30PiTjSxviGa3_Kw5ClIEDdg-3A",
                    "short-id" => "6ba85179e30d4fc2"
                ],
                "grpc-opts" => [
                    "grpc-service-name" => "grpc"
                ],
                "client-fingerprint" => "chrome"
            ],
            [
                "name" => "🇳🇱 RPN / Нидерланды",
                "type" => "vless",
                "server" => "167.148.195.15",
                "port" => 443,
                "network" => "grpc",
                "udp" => true,
                "uuid" => "296f93ca-53e8-4602-a443-cd45ba61005c",
                "packet-encoding" => "xudp",
                "tls" => true,
                "servername" => "ads.x5.ru",
                "reality-opts" => [
                    "public-key" => "ne8wv6o6AYcQoVvz30PiTjSxviGa3_Kw5ClIEDdg-3A",
                    "short-id" => "6ba85179e30d4fc2"
                ],
                "grpc-opts" => [
                    "grpc-service-name" => "grpc"
                ],
                "client-fingerprint" => "chrome"
            ]
        ],
        "proxy-groups" => [
            [
                "name" => "→ Remnawave",
                "type" => "select",
                "proxies" => [
                    "🇵🇱 RPN / Польша 1",
                    "🇵🇱 RPN / Польша 2",
                    "🇩🇪 RPN / Германия 1 🚀",
                    "🇩🇪 RPN / Германия 2 🚀",
                    "🇩🇪 RPN / Германия 3 ⚡️",
                    "🇱🇹 RPN / Литва",
                    "🇳🇱 RPN / Нидерланды 2",
                    "🇳🇴 RPN / Норвегия",
                    "🇧🇪 RPN / Бельгия",
                    "🇨🇿 RPN / Чехия",
                    "🇺🇸 RPN / США 1",
                    "🇺🇸 RPN / США 2",
                    "🇬🇧 RPN / Великобритания",
                    "🇨🇦 RPN / Канада",
                    "🇰🇿 RPN / Казахстан ЮТУБ без рекламы",
                    "🇷🇺 RPN / РФ ТГ/ЮТУБ без рекламы",
                    "🇷🇺 RPN / РФ ОБХОД",
                    "🇳🇱 RPN / Нидерланды ОБХОД 🚀",
                    "🇵🇱 RPN / Польша ОБХОД 🚀",
                    "🇵🇱 RPN / Польша 2 ОБХОД",
                    "🇩🇪 RPN / Германия ОБХОД",
                    "🇩🇪 RPN / Германия 2 ОБХОД",
                    "🇬🇧 RPN / ОБХОД 1 Мегафон,Т2,Yota",
                    "🇬🇧 RPN / ОБХОД 2 Билайн,Т2,Yota,Мег.",
                    "🇬🇧 RPN / ОБХОД 3 Мегафон,Билайн,Т2",
                    "🇬🇧 RPN / ОБХОД 4 Т2,Билайн,Yota",
                    "🇬🇧 RPN / ОБХОД 5 МТС,Т2,Yota",
                    "🇳🇱 RPN / Нидерланды ОБХОД 1",
                    "🇳🇱 RPN / Нидерланды ОБХОД 2",
                    "🇳🇱 RPN / ОБХОД 3 Yota,Мегафон,Т2",
                    "🇳🇱 RPN / ОБХОД 4 Т2,Мегафон,Билайн",
                    "🇮🇹 RPN / Италия 🚀(WIFI) 2",
                    "🇹🇷 RPN / Турция",
                    "🇳🇱 RPN / Нидерланды"
                ]
            ]
        ],
        "rules" => [
            "MATCH,→ Remnawave"
        ]
    ];

    // Сжатие ответа для ускорения загрузки
    ob_start('ob_gzhandler');
    echo json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    ob_end_flush();
    exit;
}

// Если это не V2Ray-клиент — показываем обычный сайт
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="RPN VPN - Высокоскоростной VPN сервис с каналами до 1 Гбит/с">
    <meta name="robots" content="noindex, nofollow">
    <title>RPN VPN - Скорость до 1 Гбит/с</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border-radius: 24px;
            padding: 48px 40px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            text-align: center;
        }
        
        .logo {
            font-size: 64px;
            margin-bottom: 16px;
        }
        
        h1 {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 12px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .subtitle {
            font-size: 18px;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 32px;
            line-height: 1.6;
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 32px 0;
        }
        
        .feature {
            background: rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 24px 16px;
            transition: transform 0.3s ease;
        }
        
        .feature:hover {
            transform: translateY(-4px);
        }
        
        .feature-icon {
            font-size: 32px;
            margin-bottom: 12px;
        }
        
        .feature h3 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .feature p {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.6);
        }
        
        .speed-badge {
            display: inline-block;
            background: rgba(102, 126, 234, 0.2);
            border: 1px solid rgba(102, 126, 234, 0.4);
            border-radius: 50px;
            padding: 12px 28px;
            margin: 24px 0;
            font-size: 24px;
            font-weight: 700;
            color: #667eea;
        }
        
        .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 12px;
            color: rgba(255, 255, 255, 0.4);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">⚡</div>
        <h1>RPN VPN</h1>
        <p class="subtitle">
            Высокоскоростной VPN сервис с пропускной способностью 
            до 1 Гбит/с для максимальной производительности
        </p>
        
        <div class="speed-badge">
            🚀 До 1 Гбит/с
        </div>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">🌍</div>
                <h3>Глобальная сеть</h3>
                <p>Серверы по всему миру</p>
            </div>
            <div class="feature">
                <div class="feature-icon">🔒</div>
                <h3>Безопасность</h3>
                <p>Современное шифрование</p>
            </div>
            <div class="feature">
                <div class="feature-icon">⚡</div>
                <h3>Скорость</h3>
                <p>До 1000 Мбит/с</p>
            </div>
            <div class="feature">
                <div class="feature-icon">📱</div>
                <h3>Поддержка</h3>
                <p>Все устройства</p>
            </div>
        </div>
        
        <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin-top: 20px;">
            Поддерживаемые клиенты: v2rayNG, v2rayN, Sing-box, Streisand, FoxRay, Shadowrocket и другие
        </p>
        
        <div class="footer">
            © <?php echo date('Y'); ?> RPN VPN Service. Все права защищены.
        </div>
    </div>
</body>
</html>

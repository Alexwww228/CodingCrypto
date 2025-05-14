// blowfish.js

class Blowfish {
    constructor(key) {
        this.P = new Array(18); // P-массив (18 элементов)
        this.S = new Array(4).fill(0).map(() => new Array(256)); // S-блоки (4 массива по 256 элементов)
        this.initialize(key);
    }

    // Инициализация P-массива и S-блоков
    initialize(key) {
        // Константы для инициализации P-массива и S-блоков
        const piFractionDigits = "31415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679";
        const hexDigits = piFractionDigits.split('').map(d => parseInt(d, 10));

        // Заполняем P-массив
        for (let i = 0; i < 18; i++) {
            this.P[i] = (hexDigits[i * 4] << 24) | (hexDigits[i * 4 + 1] << 16) | (hexDigits[i * 4 + 2] << 8) | hexDigits[i * 4 + 3];
        }

        // Заполняем S-блоки
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 256; j++) {
                this.S[i][j] = (hexDigits[(i * 256 + j) * 4] << 24) |
                               (hexDigits[(i * 256 + j) * 4 + 1] << 16) |
                               (hexDigits[(i * 256 + j) * 4 + 2] << 8) |
                               hexDigits[(i * 256 + j) * 4 + 3];
            }
        }

        // Модификация P-массива и S-блоков с использованием ключа
        let keyIndex = 0;
        for (let i = 0; i < 18; i++) {
            let data = 0;
            for (let j = 0; j < 4; j++) {
                data = (data << 8) | key[keyIndex % key.length];
                keyIndex++;
            }
            this.P[i] ^= data;
        }

        // Шифрование всех нулей для дальнейшей модификации
        let L = 0, R = 0;
        for (let i = 0; i < 18; i += 2) {
            [L, R] = this.encryptBlock(L, R);
            this.P[i] = L;
            this.P[i + 1] = R;
        }

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 256; j += 2) {
                [L, R] = this.encryptBlock(L, R);
                this.S[i][j] = L;
                this.S[i][j + 1] = R;
            }
        }
    }

    // Шифрование одного блока
    encryptBlock(L, R) {
        for (let i = 0; i < 16; i++) {
            L ^= this.P[i];
            R ^= this.f(L);
            [L, R] = [R, L];
        }
        [L, R] = [R, L];
        R ^= this.P[16];
        L ^= this.P[17];
        return [L, R];
    }

    // Дешифрование одного блока
    decryptBlock(L, R) {
        for (let i = 17; i > 1; i--) {
            L ^= this.P[i];
            R ^= this.f(L);
            [L, R] = [R, L];
        }
        [L, R] = [R, L];
        R ^= this.P[1];
        L ^= this.P[0];
        return [L, R];
    }

    // Функция F для сети Фейстеля
    f(x) {
        const a = (x >>> 24) & 0xFF;
        const b = (x >>> 16) & 0xFF;
        const c = (x >>> 8) & 0xFF;
        const d = x & 0xFF;
        return ((this.S[0][a] + this.S[1][b]) ^ this.S[2][c]) + this.S[3][d];
    }
}

// Генерация ключа для Blowfish
function generateBlowfishKey() {
    // Инициализация глобальной статистики
    window.blowfishStats = {
        timeStart: 0,
        timeEnd: 0,
        memoryUsed: 0,
        operations: 0
    };

    // Initialize the stats object at the start of the function
    const stats = { timeStart: 0, timeEnd: 0, memoryUsed: 0, operations: 0 };
    stats.timeStart = performance.now();

    const keyLengthBits = parseInt(document.getElementById("keyLength").value);
    const keyLengthBytes = keyLengthBits / 8;
    const key = new Uint8Array(keyLengthBytes);
    window.crypto.getRandomValues(key);

    stats.timeEnd = performance.now();
    stats.memoryUsed = key.length;
    stats.operations = 1; // Assuming one operation for key generation

    // Преобразуем ключ в строку Base64 для отображения
    const keyBase64 = btoa(String.fromCharCode(...key));
    document.getElementById("keyBlowfish").innerHTML = `
        <h3>Сгенерированный ключ:</h3>
        <p>${keyBase64}</p>
    `;
    saveBlowfishKey(key); // Сохраняем ключ

    // Отображение статистики генерации ключа
    document.getElementById("blowfishStats").innerHTML = `
        <h4>Статистика генерации ключа:</h4>
        <p>Время: ${(stats.timeEnd - stats.timeStart).toFixed(2)}ms</p>
        <p>Память: ${stats.memoryUsed} байт</p>
        <p>Операции: ${stats.operations}</p>
    `;

    // Экспортируем статистику для сравнения алгоритмов
    window.blowfishStats = {
        timeStart: stats.timeStart,
        timeEnd: stats.timeEnd,
        memoryUsed: stats.memoryUsed,
        operations: stats.operations
    };

    return key;
}

// Сохранение ключа в localStorage
function saveBlowfishKey(key) {
    const keyBase64 = btoa(String.fromCharCode(...key));
    localStorage.setItem("blowfishKey", keyBase64);
}

// Загрузка ключа из localStorage
function loadBlowfishKey() {
    const keyBase64 = localStorage.getItem("blowfishKey");
    if (!keyBase64) return null;
    const keyBytes = atob(keyBase64).split("").map(c => c.charCodeAt(0));
    return new Uint8Array(keyBytes);
}

// Шифрование файла с использованием Blowfish
async function encryptBlowfish() {
    const fileInput = document.getElementById("fileToEncryptBlowfish");
    const file = fileInput.files[0];
    if (!file) {
        alert("Пожалуйста, выберите файл для шифрования.");
        return;
    }

    const blowfishKey = loadBlowfishKey();
    if (!blowfishKey) {
        alert("Ключ не найден. Сначала сгенерируйте ключ.");
        return;
    }

    const stats = { timeStart: 0, timeEnd: 0, memoryUsed: 0, operations: 0 };
    stats.timeStart = performance.now();
    
    // Проверяем, что статистика инициализирована
    if (!window.blowfishStats) {
        window.blowfishStats = {};
    }
    window.blowfishStats.timeStart = stats.timeStart;
    window.blowfishStats.timeEnd = stats.timeEnd;
    window.blowfishStats.memoryUsed = stats.memoryUsed;
    window.blowfishStats.operations = stats.operations;

    try {
        // Читаем файл как ArrayBuffer и преобразуем его в Uint8Array
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        // Определяем размер блока и дополняем данные до кратного размера блока
        const blockSize = 8;
        const paddedLength = Math.ceil(data.length / blockSize) * blockSize;
        const paddedData = new Uint8Array(paddedLength);
        paddedData.set(data);

        // Создаем экземпляр Blowfish
        const cipher = new Blowfish(blowfishKey);

        // Разбиваем данные на блоки по 64 бита
        const encryptedBlocks = [];
        for (let i = 0; i < paddedData.length; i += blockSize) {
            const block = paddedData.slice(i, i + blockSize);

            // Преобразуем блок в два 32-битных числа
            let L = (block[0] << 24) | (block[1] << 16) | (block[2] << 8) | block[3];
            let R = (block[4] << 24) | (block[5] << 16) | (block[6] << 8) | block[7];

            // Шифруем блок
            [L, R] = cipher.encryptBlock(L, R);

            // Преобразуем обратно в байты
            const encryptedBlock = new Uint8Array(blockSize);
            encryptedBlock[0] = (L >>> 24) & 0xFF;
            encryptedBlock[1] = (L >>> 16) & 0xFF;
            encryptedBlock[2] = (L >>> 8) & 0xFF;
            encryptedBlock[3] = L & 0xFF;
            encryptedBlock[4] = (R >>> 24) & 0xFF;
            encryptedBlock[5] = (R >>> 16) & 0xFF;
            encryptedBlock[6] = (R >>> 8) & 0xFF;
            encryptedBlock[7] = R & 0xFF;

            encryptedBlocks.push(...encryptedBlock);
        }

        // Создаем Blob с зашифрованными данными
        const encryptedBlob = new Blob([new Uint8Array(encryptedBlocks)], { type: "application/octet-stream" });
        const url = URL.createObjectURL(encryptedBlob);

        // Создаем ссылку для скачивания файла
        const link = document.createElement("a");
        link.href = url;
        link.download = "enBlowfish_" + file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        stats.timeEnd = performance.now();
        stats.memoryUsed = encryptedBlocks.length;
        stats.operations = paddedData.length / blockSize; // Примерное количество операций
        
        // Проверяем, что статистика инициализирована
        if (!window.blowfishStats) {
            window.blowfishStats = {};
        }
        window.blowfishStats.timeEnd = stats.timeEnd;
        window.blowfishStats.memoryUsed = stats.memoryUsed;
        window.blowfishStats.operations = stats.operations;

        // Отображение статистики
        document.getElementById("blowfishStats").innerHTML = `
            <h4>Статистика шифрования Blowfish:</h4>
            <p>Время: ${(stats.timeEnd - stats.timeStart).toFixed(2)}ms</p>
            <p>Память: ${stats.memoryUsed} байт</p>
            <p>Операции: ${stats.operations}</p>
        `;
    } catch (error) {
        console.error("Ошибка при шифровании файла:", error);
        alert("Ошибка при шифровании файла. Проверьте консоль для деталей.");
    }
}

// Расшифровка файла с использованием Blowfish
async function decryptBlowfish() {
    const fileInput = document.getElementById("fileToDecryptBlowfish");
    const file = fileInput.files[0];
    if (!file) {
        alert("Пожалуйста, выберите файл для расшифровки.");
        return;
    }

    const blowfishKey = loadBlowfishKey();
    if (!blowfishKey) {
        alert("Ключ не найден. Сначала сгенерируйте ключ.");
        return;
    }

    try {
        // Читаем файл как ArrayBuffer и преобразуем его в Uint8Array
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        // Создаем экземпляр Blowfish
        const cipher = new Blowfish(blowfishKey);

        // Разбиваем данные на блоки по 64 бита
        const decryptedBlocks = [];
        for (let i = 0; i < data.length; i += 8) {
            const block = data.slice(i, i + 8);

            // Преобразуем блок в два 32-битных числа
            let L = (block[0] << 24) | (block[1] << 16) | (block[2] << 8) | block[3];
            let R = (block[4] << 24) | (block[5] << 16) | (block[6] << 8) | block[7];

            // Дешифруем блок
            [L, R] = cipher.decryptBlock(L, R);

            // Преобразуем обратно в байты
            const decryptedBlock = new Uint8Array(8);
            decryptedBlock[0] = (L >>> 24) & 0xFF;
            decryptedBlock[1] = (L >>> 16) & 0xFF;
            decryptedBlock[2] = (L >>> 8) & 0xFF;
            decryptedBlock[3] = L & 0xFF;
            decryptedBlock[4] = (R >>> 24) & 0xFF;
            decryptedBlock[5] = (R >>> 16) & 0xFF;
            decryptedBlock[6] = (R >>> 8) & 0xFF;
            decryptedBlock[7] = R & 0xFF;

            decryptedBlocks.push(...decryptedBlock);
        }

        // Создаем Blob с расшифрованными данными
        const decryptedBlob = new Blob([new Uint8Array(decryptedBlocks)], { type: "application/octet-stream" });
        const url = URL.createObjectURL(decryptedBlob);

        // Создаем ссылку для скачивания файла
        const link = document.createElement("a");
        link.href = url;
        link.download = "deBlowfish_" + file.name.replace(/^enBlowfish_/, ''); // Убираем префикс "enBlowfish_"
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Экспортируем статистику для сравнения алгоритмов
        if (!window.blowfishStats) {
            window.blowfishStats = {};
        }
        stats.timeStart = performance.now();
        stats.timeEnd = performance.now();
        stats.memoryUsed = decryptedBlocks.length;
        stats.operations = decryptedBlocks.length / 8; // Примерное количество операций
        window.blowfishStats.timeStart = stats.timeStart;
        window.blowfishStats.timeEnd = stats.timeEnd;
        window.blowfishStats.memoryUsed = stats.memoryUsed;
        window.blowfishStats.operations = stats.operations;
    } catch (error) {
        alert("Ошибка при расшифровке файла: " + error.message);
    }
}
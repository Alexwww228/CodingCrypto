let publicKey, privateKey;

// Функция для генерации случайного простого числа
function generatePrime() {
    let num;
    do {
        num = Math.floor(Math.random() * (1000 - 50 + 1)) + 50; // Генерация случайного числа
    } while (!isPrime(num));
    return num;
}

// Проверка на простоту числа
function isPrime(n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
}

// Функция для вычисления наибольшего общего делителя
function gcd(a, b) {
    while (b !== 0) {
        [a, b] = [b, a % b];
    }
    return a;
}

// Функция для вычисления мультипликативной инверсии по модулю
function modInverse(a, m) {
    let m0 = m, t, q;
    let x0 = 0, x1 = 1;

    if (m === 1) return 0;

    while (a > 1) {
        q = Math.floor(a / m);
        [m, a] = [a % m, m];
        [x0, x1] = [x1 - q * x0, x0];
    }

    if (x1 < 0) x1 += m0;

    return x1;
}

// Генерация публичного и приватного ключа
function generateRSAKeys() {
    const p = generatePrime();
    let q;
    do {
        q = generatePrime();
    } while (p === q); // Убедитесь, что p и q разные

    const n = p * q;
    const phi = (p - 1) * (q - 1);

    let e;
    do {
        e = Math.floor(Math.random() * (phi - 2)) + 2; // Эфир e должен быть больше 1
    } while (gcd(e, phi) !== 1);

    const d = modInverse(e, phi);

    publicKey = { e, n };
    privateKey = { d, n };

    document.getElementById("keyRSA").innerHTML = `
        <h3>Публичный ключ:</h3>
        <pre>e: ${publicKey.e}, n: ${publicKey.n}</pre>
        <h3>Приватный ключ:</h3>
        <pre>d: ${privateKey.d}, n: ${privateKey.n}</pre>
    `;
}

// Модульное возведение в степень с использованием BigInt
function modExp(base, exp, mod) {
    let result = BigInt(1);
    base = base % mod;
    while (exp > 0) {
        if (exp % 2n === 1n) {
            result = (result * base) % mod;
        }
        exp = exp / 2n;
        base = (base * base) % mod;
    }
    return result;
}

// Шифрование байтового массива по блокам
function encryptData(data, e, n) {
    const encryptedBlocks = [];
    const blockSize = Math.floor(Math.log2(Number(n)) / Math.log2(256)); // Размер блока, который можно зашифровать

    console.log(`Размер блока: ${blockSize}`);

    // Преобразуем данные в блоки
    for (let i = 0; i < data.length; i += blockSize) {
        const block = data.slice(i, i + blockSize);
        
        // Дополняем последний блок, если он меньше размера
        while (block.length < blockSize) {
            block.push(0); // Добавляем нули в конец блока
        }

        const blockNumber = block.reduce((acc, byte) => (acc << 8) | byte, 0); // Преобразуем в одно число
        const encryptedBlock = modExp(BigInt(blockNumber), BigInt(e), BigInt(n)); // Шифруем блок
        encryptedBlocks.push(encryptedBlock);
    }

    return encryptedBlocks;
}

// Расшифровка байтового массива
function decryptData(data, d, n) {
    const decryptedBytes = [];

    // Обрабатываем каждый зашифрованный блок
    for (const block of data) {
        const decryptedBlock = modExp(BigInt(block), BigInt(d), BigInt(n)); // Расшифровка
        let blockNum = decryptedBlock;
        const bytes = [];

        // Вытаскиваем байты из числа
        while (blockNum > 0) {
            bytes.unshift(Number(blockNum & 0xffn)); // Получаем последние 8 бит
            blockNum >>= 8n; // Сдвигаем
        }

        // Добавляем расшифрованные байты в итоговый результат
        decryptedBytes.push(...bytes);
    }

    // Убираем дополнительные нули, если они были добавлены в последний блок
    while (decryptedBytes[decryptedBytes.length - 1] === 0) {
        decryptedBytes.pop();
    }

    return decryptedBytes;
}

// Функция для чтения и шифрования файла
function encryptRSA() {
    const file = document.getElementById("fileToEncryptRSA").files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const byteArray = new Uint8Array(event.target.result);
            console.log("Загружен файл, размер:", byteArray.length);

            const encryptedData = encryptData(Array.from(byteArray), publicKey.e, publicKey.n);

            const encryptedBlob = new Blob([new Uint8Array(encryptedData.map(Number))], { type: "application/octet-stream" });
            const url = URL.createObjectURL(encryptedBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "enRSA_" + file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        reader.readAsArrayBuffer(file);
    } else {
        console.error("Файл для шифрования не выбран.");
    }
}

// Функция для чтения и расшифровки файла
function decryptRSA() {
    const file = document.getElementById("fileToDecryptRSA").files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const encryptedArray = new Uint8Array(event.target.result);
            console.log("Загружен зашифрованный файл, размер:", encryptedArray.length);

            const decryptedData = decryptData(Array.from(encryptedArray), privateKey.d, privateKey.n);
            console.log("Расшифрованные данные:", decryptedData);

            const decryptedBlob = new Blob([new Uint8Array(decryptedData)], { type: "application/octet-stream" });
            const url = URL.createObjectURL(decryptedBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "deRSA_" + file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        reader.readAsArrayBuffer(file);
    } else {
        console.error("Файл для расшифровки не выбран.");
    }
}

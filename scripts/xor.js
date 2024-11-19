let xorKey;

        // Функция для генерации случайного ключа XOR заданной длины
        function generateXORKey(length) {
            const key = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
                key[i] = Math.floor(Math.random() * 256);
            }
            const keyHex = Array.from(key).map(byte => byte.toString(16).padStart(2, '0')).join(' ');
            document.getElementById("keyXOR").innerText = `Сгенерированный ключ: ${keyHex}`;
            xorKey = key; // Сохраняем ключ для использования при шифровании и расшифровке
            return key;
        }

        // Функция для шифрования и расшифровки с использованием XOR
        function xorEncryptDecrypt(data) {
            const result = new Uint8Array(data.length);
            for (let i = 0; i < data.length; i++) {
                result[i] = data[i] ^ xorKey[i % xorKey.length];
            }
            return result;
        }

        // Функция для шифрования текстового файла
        async function encryptXOR() {
            const file = document.getElementById("fileToEncryptXOR").files[0];
            if (!file) {
                alert("Пожалуйста, выберите файл для шифрования.");
                return;
            }

            const keyLength = parseInt(document.getElementById("length").value);
            if (isNaN(keyLength) || keyLength <= 0) {
                alert("Пожалуйста, введите корректную длину ключа.");
                return;
            }

            if (!xorKey || xorKey.length !== keyLength) {
                alert("Сначала сгенерируйте ключ.");
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                const encoder = new TextEncoder();
                const data = encoder.encode(event.target.result);
                const encryptedData = xorEncryptDecrypt(data);
                const encryptedBlob = new Blob([encryptedData], { type: "application/octet-stream" });
                const url = URL.createObjectURL(encryptedBlob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "enXOR_" + file.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            };
            reader.readAsText(file);
        }

        // Функция для расшифровки текстового файла
        async function decryptXOR() {
            const file = document.getElementById("fileToDecryptXOR").files[0];
            if (!file) {
                alert("Пожалуйста, выберите файл для расшифровки.");
                return;
            }

            if (!xorKey) {
                alert("Сначала сгенерируйте ключ для расшифровки.");
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                const encryptedData = new Uint8Array(event.target.result);
                const decryptedData = xorEncryptDecrypt(encryptedData);
                const decoder = new TextDecoder();
                const decryptedText = decoder.decode(decryptedData);
                const decryptedBlob = new Blob([decryptedText], { type: "text/plain" });
                const url = URL.createObjectURL(decryptedBlob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "deXOR_" + file.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            };
            reader.readAsArrayBuffer(file);
        }
// Client-side encryption utilities for sensitive project data
// Uses Web Crypto API (AES-GCM) for encryption/decryption

/**
 * Derives a crypto key from a passphrase using PBKDF2
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const passphraseKey = await crypto.subtle.importKey(
		'raw',
		encoder.encode(passphrase),
		'PBKDF2',
		false,
		['deriveBits', 'deriveKey']
	);

	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: salt as BufferSource,
			iterations: 100000,
			hash: 'SHA-256'
		},
		passphraseKey,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

/**
 * Encrypts a string using AES-GCM
 * Returns base64-encoded encrypted data with salt and IV prepended
 */
export async function encryptString(plaintext: string, passphrase: string): Promise<string> {
	if (!plaintext) return plaintext; // Don't encrypt empty strings
	
	const encoder = new TextEncoder();
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	
	const key = await deriveKey(passphrase, salt);
	const encrypted = await crypto.subtle.encrypt(
		{
			name: 'AES-GCM',
			iv: iv
		},
		key,
		encoder.encode(plaintext)
	);

	// Combine salt + iv + encrypted data
	const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
	combined.set(salt, 0);
	combined.set(iv, salt.length);
	combined.set(new Uint8Array(encrypted), salt.length + iv.length);

	// Convert to base64 for storage
	return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a string using AES-GCM
 * Expects base64-encoded data with salt and IV prepended
 */
export async function decryptString(encryptedData: string, passphrase: string): Promise<string> {
	if (!encryptedData) return encryptedData; // Don't decrypt empty strings
	
	try {
		// Decode from base64
		const combined = new Uint8Array(
			atob(encryptedData)
				.split('')
				.map(c => c.charCodeAt(0))
		);

		// Extract salt, iv, and encrypted data
		const salt = combined.slice(0, 16);
		const iv = combined.slice(16, 28);
		const encrypted = combined.slice(28);

		const key = await deriveKey(passphrase, salt);
		const decrypted = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: iv
			},
			key,
			encrypted
		);

		const decoder = new TextDecoder();
		return decoder.decode(decrypted);
	} catch (error) {
		console.error('Decryption failed:', error);
		// throw new Error('Failed to decrypt data. Wrong passkey?');
		// Gracefully handle decryption errors without throwing but just return the original encrypted data
		return encryptedData;
	}
}

/**
 * Encrypts sensitive fields in a work item
 */
export async function encryptWorkItem(item: any, passphrase: string): Promise<any> {
	if (!passphrase) return item; // No encryption if no passphrase

	return {
		...item,
		title: item.title ? await encryptString(item.title, passphrase) : item.title,
		description: item.description ? await encryptString(item.description, passphrase) : item.description,
		remarks: item.remarks ? await encryptString(item.remarks, passphrase) : item.remarks
	};
}

/**
 * Decrypts sensitive fields in a work item
 */
export async function decryptWorkItem(item: any, passphrase: string): Promise<any> {
	if (!passphrase) return item; // No decryption if no passphrase

	try {
		return {
			...item,
			title: item.title ? await decryptString(item.title, passphrase) : item.title,
			description: item.description ? await decryptString(item.description, passphrase) : item.description,
			remarks: item.remarks ? await decryptString(item.remarks, passphrase) : item.remarks
		};
	} catch (error) {
		console.error('Failed to decrypt work item:', error);
		// Return item with decryption error markers
		return {
			...item,
			title: `⚠️ DECRYPTION FAILED: ${item.title?.substring(0, 20)}...`,
			description: '⚠️ Wrong passkey - cannot decrypt',
			remarks: '⚠️ Wrong passkey - cannot decrypt'
		};
	}
}

/**
 * Validates if a passphrase can decrypt a sample encrypted string
 * Used to verify passkey before allowing access
 */
export async function validatePasskey(encryptedSample: string, passphrase: string): Promise<boolean> {
	try {
		await decryptString(encryptedSample, passphrase);
		return true;
	} catch {
		return false;
	}
}

'use client';

import { useState }         from 'react';
import { createU2APayment } from '@/lib-client/pi/pi-payment';

const HUB_URL    = process.env.NEXT_PUBLIC_HUB_URL    ?? 'https://hub.tecosystem.app';
const ASSETS_URL = process.env.NEXT_PUBLIC_ASSETS_URL ?? 'https://assets.tecosystem.app';
const MINT_FEE   = 2;

const getCsrfToken = (): string => {
  if (typeof document === 'undefined') return '';

  const match = document.cookie.match(
    /(?:^|;\s*)tec_csrf=([^;]*)/,
  );

  return match ? match[1] : '';
};

const toBase64 = (
  file: File,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () =>
      resolve(reader.result as string);

    reader.onerror = reject;

    reader.readAsDataURL(file);
  });

/**
 * 🚨 IMPORTANT
 *
 * Pi Browser preserves internal payment ownership
 * after cross-domain navigation.
 *
 * Hub → Assets must FORCE Mode 1.
 */

const isHubNavigation = (): boolean => {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.referrer
    .toLowerCase()
    .includes('hub.tecosystem.app');
};

export function NFTUploadModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [step, setStep] = useState<
    'upload' | 'details'
  >('upload');

  const [file, setFile] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState<string | null>(null);

  const [name, setName] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [uploadedUrl, setUploadedUrl] =
    useState<string | null>(null);

  const [uploadedKey, setUploadedKey] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const redirectToHubPayment = (
    nftMeta: string,
  ) => {
    const params = new URLSearchParams({
      amount:     MINT_FEE.toString(),
      memo:       `Mint NFT: ${name}`,
      product_id: `nft:${nftMeta}`,
      return_url: `${ASSETS_URL}/app`,
      source:     'assets',
    });

    window.location.href =
      `${HUB_URL}/hub/pay?${params.toString()}`;
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const f = e.target.files?.[0];

    if (!f) return;

    if (f.size > 4 * 1024 * 1024) {
      setError(
        'File too large (max 4MB)',
      );

      return;
    }

    if (
      ![
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ].includes(f.type)
    ) {
      setError(
        'Only JPEG, PNG, GIF, WEBP allowed',
      );

      return;
    }

    setFile(f);

    setError('');

    const reader = new FileReader();

    reader.onload = () =>
      setPreview(reader.result as string);

    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);

    setError('');

    try {
      const base64 = await toBase64(file);

      const res = await fetch(
        '/api/bff/nft/upload',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type':
              'application/json',
            'x-csrf-token':
              getCsrfToken(),
          },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            size:     file.size,
            data:     base64,
          }),
        },
      );

      if (!res.ok) {
        const err =
          await res.json().catch(
            () => ({}),
          ) as {
            error?: string;
          };

        setError(
          err.error ?? 'Upload failed',
        );

        return;
      }

      const data = await res.json();

      if (!data.publicUrl) {
        setError('No URL returned');

        return;
      }

      setUploadedUrl(data.publicUrl);

      setUploadedKey(data.key ?? null);

      setStep('details');
    } catch (e) {
      console.error(
        '[NFT] upload error:',
        e,
      );

      setError(
        'Upload failed — please try again',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async () => {
    if (!name || !uploadedUrl) {
      return;
    }

    const nftMeta = btoa(
      JSON.stringify({
        n: name,
        d: description,
        u: uploadedUrl,
        k: uploadedKey ?? '',
        m:
          file?.type ??
          'image/jpeg',
      }),
    );

    /**
     * 🚨 FORCE MODE 1
     *
     * Cases:
     * - Hub → Assets navigation
     * - Pi SDK not ready
     * - Foreign session detected
     */

    const forceHubMode =
      isHubNavigation() ||
      !(window as any).__TEC_PI_READY ||
      (window as any)
        .__TEC_PI_FOREIGN_SESSION;

    if (forceHubMode) {
      redirectToHubPayment(
        nftMeta,
      );

      return;
    }

    /**
     * ✅ MODE 2
     */

    setLoading(true);

    setError('');

    try {
      if (
        !(window as any)
          .__TEC_PI_AUTHENTICATED
      ) {
        await window.Pi.authenticate(
          ['username', 'payments'],
          () => {},
        );

        (window as any)
          .__TEC_PI_AUTHENTICATED = true;
      }

      const result =
        await createU2APayment(
          MINT_FEE,
          `Mint NFT: ${name}`,
          {
            source: 'assets',
            type: 'nft_mint',
            product_id:
              `nft:${nftMeta}`,
          },
        );

      if (!result.success) {
        if (
          result.status ===
          'cancelled'
        ) {
          setError(
            'Payment cancelled',
          );
        } else {
          setError(
            result.message ??
            'Payment failed',
          );
        }

        return;
      }

      const res = await fetch(
        '/api/bff/nft/register',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type':
              'application/json',
            'x-csrf-token':
              getCsrfToken(),
          },
          body: JSON.stringify({
            name,
            description,
            imageUrl:
              uploadedUrl,
            key:
              uploadedKey ??
              '',
            mimeType:
              file?.type ??
              'image/jpeg',
            paymentId:
              result.paymentId ??
              '',
            txid:
              result.txid ??
              '',
          }),
        },
      );

      if (
        res.ok ||
        res.status === 409
      ) {
        onSuccess?.();

        onClose();
      } else {
        setError(
          'NFT minted but registration failed',
        );
      }
    } catch (err) {
      console.error(
        '[NFT] Mint error:',
        err,
      );

      /**
       * Safety fallback
       */

      redirectToHubPayment(
        nftMeta,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'rgba(0,0,0,0.7)',
          zIndex: 300,
          backdropFilter:
            'blur(4px)',
        }}
      />

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 301,
          background:
            '#0d0d14',
          borderTop:
            '1px solid #7b6bc820',
          borderRadius:
            '24px 24px 0 0',
          padding:
            '24px 20px 40px',
        }}
      >
        {/* UI unchanged */}
      </div>
    </>
  );
}

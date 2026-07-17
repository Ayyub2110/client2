import { supabaseAdmin } from './src/utils/supabase';
import { uploadPhoto } from './src/utils/photoUpload';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

function parseBase64DataUrl(dataUrl: string): { buffer: Buffer; mimetype: string; ext: string } {
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
  if (!matches) {
    throw new Error('Invalid base64 data URL format');
  }
  const mimetype = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  let ext = '.png';
  if (mimetype.includes('jpeg') || mimetype.includes('jpg')) {
    ext = '.jpg';
  } else if (mimetype.includes('webp')) {
    ext = '.webp';
  }
  return { buffer, mimetype, ext };
}

async function run() {
  console.log('--- KYC Base64 Self-Healing DB Script ---');
  try {
    const { data: repairs, error } = await supabaseAdmin
      .from('repairs')
      .select('id, job_number, kyc_details')
      .not('kyc_details', 'is', null);

    if (error) {
      console.error('Failed to fetch repairs:', error.message);
      return;
    }

    console.log(`Fetched ${repairs.length} repairs with kyc_details to inspect.`);
    let fixedCount = 0;

    for (const repair of repairs) {
      const kycStr = repair.kyc_details;
      if (!kycStr) continue;

      let kyc: any;
      try {
        kyc = JSON.parse(kycStr);
      } catch (e) {
        console.error(`[Job ${repair.job_number}] Skipped: kyc_details is not valid JSON.`);
        continue;
      }

      let updated = false;
      const keys = ['idCardFront', 'idCardBack', 'mobileFront', 'mobileBack', 'customerPhoto', 'signature'];

      for (const key of keys) {
        const val = kyc[key];
        if (val && typeof val === 'string' && val.startsWith('data:image/')) {
          console.log(`[Job ${repair.job_number}] Found base64 string under key "${key}" (length: ${val.length}). Processing...`);
          try {
            const parsed = parseBase64DataUrl(val);
            const fakeFile = {
              fieldname: key,
              originalname: `${key}_${uuidv4()}${parsed.ext}`,
              encoding: '7bit',
              mimetype: parsed.mimetype,
              size: parsed.buffer.length,
              buffer: parsed.buffer,
              destination: '',
              filename: '',
              path: ''
            } as Express.Multer.File;

            const url = await uploadPhoto(fakeFile, 'device-photos');
            kyc[key] = url;
            updated = true;
            console.log(`  └ ✅ Uploaded and replaced with URL: ${url.slice(0, 60)}...`);
          } catch (uploadErr: any) {
            console.error(`  └ ❌ Failed to upload: ${uploadErr.message}`);
          }
        }
      }

      if (updated) {
        const updatedKycStr = JSON.stringify(kyc);
        const { error: updateError } = await supabaseAdmin
          .from('repairs')
          .update({ kyc_details: updatedKycStr })
          .eq('id', repair.id);

        if (updateError) {
          console.error(`[Job ${repair.job_number}] ❌ Failed to update database:`, updateError.message);
        } else {
          console.log(`[Job ${repair.job_number}] 🎉 Successfully updated DB row with clean JSON.`);
          fixedCount++;
        }
      }
    }

    console.log(`\nSelf-healing complete. Cleaned up and fixed ${fixedCount} tickets.`);
  } catch (err) {
    console.error('Self-healing script error:', err);
  }
}

run();

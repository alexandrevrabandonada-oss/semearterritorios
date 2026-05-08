import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://gtpitwhslqjgbuwlsaqg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorage() {
  const bucketName = 'project-memory-documents';
  const reportId = '00000000-0000-0000-0000-000000000001';
  const fileName = 'test-upload.txt';
  const filePath = `${reportId}/${Date.now()}-${fileName}`;
  const fileContent = 'Conteudo de teste para validacao remota.';

  console.log(`Testing upload to bucket ${bucketName}...`);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, fileContent, {
      contentType: 'text/plain',
      upsert: true
    });

  if (uploadError) {
    console.error('Upload Error:', uploadError.message);
    return;
  }

  console.log('Upload successful:', uploadData.path);

  console.log('Testing signed URL generation...');
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, 60);

  if (signedUrlError) {
    console.error('Signed URL Error:', signedUrlError.message);
  } else {
    console.log('Signed URL generated:', signedUrlData.signedUrl);
  }

  // Test restricted file type
  console.log('Testing restricted file type (exe)...');
  const { data: exeData, error: exeError } = await supabase.storage
    .from(bucketName)
    .upload(`${reportId}/malicious.exe`, 'fake exe content', {
      contentType: 'application/x-msdownload'
    });

  if (exeError) {
    console.log('Blocked restricted file (Expected):', exeError.message);
  } else {
    console.warn('Restricted file was uploaded! (Security Risk)');
  }

  // Cleanup
  await supabase.storage.from(bucketName).remove([filePath]);
  console.log('Cleanup done.');
}

testStorage();

import {describe,it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {uploadFecFile} from '@/lib/fec-files';
describe('upload direto com JWT do profissional',()=>{
 it('preserva os bytes no Storage privado sem trafegá-los pela API de metadados',async()=>{const upload=vi.fn().mockResolvedValue({error:null});const from=vi.fn().mockReturnValue({upload});const storage={from} as unknown as SupabaseClient['storage'];const file=new File(['%PDF-1.4'],'Mapa.pdf',{type:'application/pdf'});const r=await uploadFecFile(storage,'record',file);expect(from).toHaveBeenCalledWith('fec-technical-private');expect(upload).toHaveBeenCalledWith(r.objectName,file,{contentType:'application/pdf',upsert:false});expect(r.title).toBe('Mapa.pdf');expect(r).not.toHaveProperty('file');});
 it('recusa formatos não aceitos e arquivos acima do limite antes de enviar',async()=>{const from=vi.fn();const storage={from} as unknown as SupabaseClient['storage'];await expect(uploadFecFile(storage,'record',new File(['x'],'arquivo.html',{type:'text/html'}))).rejects.toThrow('Aceitos');await expect(uploadFecFile(storage,'record',new File([new Uint8Array(10485761)],'maior.pdf',{type:'application/pdf'}))).rejects.toThrow('10 MB');expect(from).not.toHaveBeenCalled();});
});

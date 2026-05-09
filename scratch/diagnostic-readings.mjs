import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  "https://gtpitwhslqjgbuwlsaqg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cGl0d2hzbHFqZ2J1d2xzYXFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUzODk2MiwiZXhwIjoyMDg1MTE0OTYyfQ.4DIY5-CNDYXtp4Lqlt26hXAp3coAei3gdolOA3q9JSI"
);

async function runDiagnostic() {
  console.log("--- DIAGNÓSTICO DOS DADOS PARA LEITURAS COLETIVAS ---");

  const { data: records, error: recordsError } = await supabase.from("listening_records").select("*");
  if (recordsError) throw recordsError;

  const { data: themes, error: themesError } = await supabase.from("themes").select("*");
  if (themesError) throw themesError;

  const { data: recordThemes, error: recordThemesError } = await supabase.from("listening_record_themes").select("*");
  if (recordThemesError) throw recordThemesError;

  const { data: neighborhoods, error: neighborhoodsError } = await supabase.from("neighborhoods").select("*");
  if (neighborhoodsError) throw neighborhoodsError;

  const { data: places, error: placesError } = await supabase.from("place_mentioned").select("*, normalized_places(*)");
  if (placesError) throw placesError;

  console.log(`Total de escutas: ${records.length}`);
  console.log(`Total revisadas: ${records.filter(r => r.review_status === "reviewed").length}`);
  
  const byActionNeighborhood = records.reduce((acc, r) => {
    acc[r.neighborhood_id] = (acc[r.neighborhood_id] || 0) + 1;
    return acc;
  }, {});
  console.log(`Territórios da ação: ${Object.keys(byActionNeighborhood).length}`);

  const byRespondentNeighborhood = records.reduce((acc, r) => {
    acc[r.respondent_neighborhood_id] = (acc[r.respondent_neighborhood_id] || 0) + 1;
    return acc;
  }, {});
  console.log(`Territórios de referência: ${Object.keys(byRespondentNeighborhood).length}`);
  console.log(`Escutas sem território de referência: ${records.filter(r => !r.respondent_neighborhood_id).length}`);

  const byOccupation = records.reduce((acc, r) => {
    const occ = r.respondent_occupation || "Não informada";
    acc[occ] = (acc[occ] || 0) + 1;
    return acc;
  }, {});
  console.log(`Ocupações cadastradas: ${Object.keys(byOccupation).length}`);

  const safePlaces = (places || []).filter(p => p.normalized_places && (p.normalized_places.visibility === "internal" || p.normalized_places.visibility === "public_safe"));
  console.log(`Lugares mencionados seguros: ${safePlaces.length}`);

  console.log("--- FIM DO DIAGNÓSTICO ---");
}

runDiagnostic();

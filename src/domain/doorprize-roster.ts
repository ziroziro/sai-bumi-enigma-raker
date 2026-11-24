import { getParticipantPhotoUrl } from "./participant-photos";

export interface DoorprizeEntry {
  id: string;
  name: string;
  photoUrl: string | null;
  bucket: "a" | "b";
}

interface RawDoorprizeItem {
  name: string;
  bucket: "a" | "b";
}

/**
 * Daftar resmi peserta undian doorprize (45 orang sesuai NAMA PESERTA DOORPRIZE.xlsx).
 */
const DOORPRIZE_EXCEL_ROSTER: RawDoorprizeItem[] = [
  { name: "REZA AGNESTASIA", bucket: "a" },
  { name: "AGUNG LAKSONO", bucket: "a" },
  { name: "ZARRA VIERNIA CHAIRUNNISYA", bucket: "a" },
  { name: "MARDIANA M", bucket: "a" },
  { name: "NITAMI SUGIYATI", bucket: "a" },
  { name: "M RAFLI JULIAN", bucket: "a" },
  { name: "DHANAWA RYLLA INSANI", bucket: "a" },
  { name: "UTAMI ANESTASIA", bucket: "a" },
  { name: "NAGARA", bucket: "a" },
  { name: "SONNY KURNIAWAN", bucket: "a" },
  { name: "RIZKI BHASKARA MULYA EFENDI", bucket: "a" },
  { name: "ACHMAD TESSAR SULISTIONO", bucket: "a" },
  { name: "DEFRY RAMANDA MIFTA", bucket: "a" },
  { name: "FADLILLAH AZHAR", bucket: "a" },
  { name: "MUHAMMAD BEBE", bucket: "a" },
  { name: "AHMAD FARHAN LUBIS", bucket: "a" },
  { name: "NUR ROHMAN", bucket: "a" },
  { name: "KURNIAWAN", bucket: "a" },
  { name: "M IBNU ASYAIRI", bucket: "a" },
  { name: "AZZAH YUMNA FAIZA", bucket: "a" },
  { name: "EL VITO KUMALA", bucket: "a" },
  { name: "YANDA YONATHAN", bucket: "a" },
  { name: "RIO PALANI", bucket: "a" },
  { name: "RIDWAN TAUFIK", bucket: "a" },
  { name: "LEO FERIYANTO", bucket: "a" },
  { name: "RAHMADDANI MULIA", bucket: "a" },
  { name: "IGO RELINDO", bucket: "a" },
  { name: "MUHAMMAD AMIN", bucket: "a" },
  { name: "TRIDOYO AFIT WIJAYA", bucket: "a" },
  { name: "WAHYUNAN . ARIEF", bucket: "a" },
  { name: "JUWITA SOFIYANTI", bucket: "a" },
  { name: "BASUKI RAHMAT", bucket: "a" },
  { name: "YOGI DWI YANTO SM", bucket: "a" },
  { name: "MOHAMMAD SYARIFUDIN", bucket: "a" },
  { name: "EBIE FICKRI", bucket: "a" },
  { name: "COSMOS RUDIANTO", bucket: "a" },
  { name: "RIO NURMAN SAPUTRA", bucket: "b" },
  { name: "UTOMO BAHTIAR MAZID", bucket: "b" },
  { name: "ROMANIARTINI DESIWI", bucket: "b" },
  { name: "FERNANDO HOSE", bucket: "b" },
  { name: "SAFIRA DAMAYANTI RISSAL", bucket: "b" },
  { name: "INDRA JAYA PUTRA", bucket: "b" },
  { name: "JOKO HERIYANTO", bucket: "b" },
  { name: "RIDHO AKBAR MENDOVA", bucket: "b" },
  { name: "IIN NOVIYANTI", bucket: "b" },
];

export function buildDoorprizePool(): DoorprizeEntry[] {
  return DOORPRIZE_EXCEL_ROSTER.map((item, idx) => ({
    id: `dp-${String(idx + 1).padStart(2, "0")}`,
    name: item.name,
    photoUrl: getParticipantPhotoUrl(undefined, item.name),
    bucket: item.bucket,
  }));
}

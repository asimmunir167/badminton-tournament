// Reference list for the "quick add" dropdown on the Districts screen.
// This is a convenience shortcut, not a hard limit — the backend has no
// hardcoded district list (per spec: admins must be able to add/edit/delete
// any district), so an "Other" option in the UI still allows any custom name.
export interface PunjabDistrict {
  name: string;
  code: string;
}

export const PUNJAB_DISTRICTS: PunjabDistrict[] = [
  { name: "Attock", code: "ATK" },
  { name: "Bahawalnagar", code: "BWN" },
  { name: "Bahawalpur", code: "BWP" },
  { name: "Bhakkar", code: "BHK" },
  { name: "Chakwal", code: "CHK" },
  { name: "Chiniot", code: "CHN" },
  { name: "Dera Ghazi Khan", code: "DGK" },
  { name: "Faisalabad", code: "FSD" },
  { name: "Gujranwala", code: "GRW" },
  { name: "Gujrat", code: "GJT" },
  { name: "Hafizabad", code: "HFB" },
  { name: "Jhang", code: "JHG" },
  { name: "Jhelum", code: "JHL" },
  { name: "Kasur", code: "KSR" },
  { name: "Khanewal", code: "KWL" },
  { name: "Khushab", code: "KHB" },
  { name: "Kot Addu", code: "KAD" },
  { name: "Lahore", code: "LHR" },
  { name: "Layyah", code: "LYH" },
  { name: "Lodhran", code: "LDN" },
  { name: "Mandi Bahauddin", code: "MBD" },
  { name: "Mianwali", code: "MWL" },
  { name: "Multan", code: "MUL" },
  { name: "Murree", code: "MRE" },
  { name: "Muzaffargarh", code: "MZG" },
  { name: "Nankana Sahib", code: "NKS" },
  { name: "Narowal", code: "NRL" },
  { name: "Okara", code: "OKR" },
  { name: "Pakpattan", code: "PKP" },
  { name: "Rahim Yar Khan", code: "RYK" },
  { name: "Rajanpur", code: "RJP" },
  { name: "Rawalpindi", code: "RWP" },
  { name: "Sahiwal", code: "SWL" },
  { name: "Sargodha", code: "SGD" },
  { name: "Sheikhupura", code: "SKP" },
  { name: "Sialkot", code: "SLK" },
  { name: "Talagang", code: "TLG" },
  { name: "Taunsa", code: "TNS" },
  { name: "Toba Tek Singh", code: "TTS" },
  { name: "Vehari", code: "VHR" },
  { name: "Wazirabad", code: "WZD" },
];

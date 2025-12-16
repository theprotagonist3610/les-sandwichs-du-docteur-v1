import { useState, useEffect, useRef } from "react";
import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, Check, X } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+229", country: "BJ", flag: "🇧🇯", name: "Bénin" },
  { code: "+228", country: "TG", flag: "🇹🇬", name: "Togo" },
  { code: "+225", country: "CI", flag: "🇨🇮", name: "Côte d'Ivoire" },
];

const PhoneTaker = ({ setPhoneNumber, id = "phone-input", placeholder = "XX XX XX XX XX", required = false }) => {
  const [countryCode, setCountryCode] = useState("+225");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [isValid, setIsValid] = useState(null);
  const setPhoneNumberRef = useRef(setPhoneNumber);

  // Mettre à jour la ref quand setPhoneNumber change
  useEffect(() => {
    setPhoneNumberRef.current = setPhoneNumber;
  }, [setPhoneNumber]);

  useEffect(() => {
    // Validation du numéro de téléphone
    if (phoneDigits.length === 0) {
      setIsValid(null);
      setPhoneNumberRef.current("");
      return;
    }

    // Construire le numéro complet
    const fullNumber = `${countryCode}${phoneDigits}`;

    try {
      // Vérifier si le numéro est valide
      const valid = isValidPhoneNumber(fullNumber);

      if (valid && phoneDigits.length === 10) {
        setIsValid(true);
        // Retourner le numéro au format demandé: + | indicatif | 10 chiffres
        setPhoneNumberRef.current(fullNumber);
      } else {
        setIsValid(false);
        setPhoneNumberRef.current("");
      }
    } catch (error) {
      setIsValid(false);
      setPhoneNumberRef.current("");
    }
  }, [countryCode, phoneDigits]);

  const handlePhoneDigitsChange = (e) => {
    const value = e.target.value;
    // Accepter seulement les chiffres et limiter à 10 caractères
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    setPhoneDigits(digitsOnly);
  };

  const handleCountryCodeChange = (value) => {
    setCountryCode(value);
  };

  return (
    <InputGroup>
      <InputGroupAddon>
        <Phone className="w-4 h-4 text-muted-foreground" />
      </InputGroupAddon>

      <Select value={countryCode} onValueChange={handleCountryCodeChange}>
        <SelectTrigger
          className="w-[100px] flex-none rounded-none border-0 border-r bg-transparent shadow-none focus-visible:ring-0"
        >
          <SelectValue>
            {COUNTRY_CODES.find((c) => c.code === countryCode)?.flag}{" "}
            {countryCode}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              <span className="flex items-center gap-2">
                <span>{country.flag}</span>
                <span>{country.code}</span>
                <span className="text-xs text-muted-foreground">
                  {country.name}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <InputGroupInput
        id={id}
        type="tel"
        placeholder={placeholder}
        value={phoneDigits}
        onChange={handlePhoneDigitsChange}
        required={required}
        className="flex-1"
      />

      <InputGroupAddon>
        {isValid === null ? (
          <div className="w-4 h-4" />
        ) : isValid ? (
          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
        ) : (
          <X className="w-4 h-4 text-red-600 dark:text-red-400" />
        )}
      </InputGroupAddon>
    </InputGroup>
  );
};

export default PhoneTaker;

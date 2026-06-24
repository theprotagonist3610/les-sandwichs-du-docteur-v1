import { useState, useEffect, useRef } from "react";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Phone, Check, X } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

const COUNTRY_CODES = [
  { code: "+229", country: "BJ", flag: "🇧🇯", name: "Bénin" },
  { code: "+228", country: "TG", flag: "🇹🇬", name: "Togo" },
  { code: "+225", country: "CI", flag: "🇨🇮", name: "Côte d'Ivoire" },
];

const PhoneTaker = ({
  setPhoneNumber,
  id = "phone-input",
  placeholder = "XX XX XX XX XX",
  required = false,
}) => {
  const [countryCode, setCountryCode] = useState("+229");
  const [phoneDigits, setPhoneDigits] = useState("");
  // null = non touché · true = valide · false = invalide (affiché après blur)
  const [isValid, setIsValid] = useState(null);
  const [touched, setTouched] = useState(false);
  const setPhoneNumberRef = useRef(setPhoneNumber);

  useEffect(() => {
    setPhoneNumberRef.current = setPhoneNumber;
  }, [setPhoneNumber]);

  useEffect(() => {
    if (phoneDigits.length === 0) {
      setIsValid(null);
      setPhoneNumberRef.current("");
      return;
    }

    const fullNumber = `${countryCode}${phoneDigits}`;
    try {
      const valid = isValidPhoneNumber(fullNumber) && phoneDigits.length === 10;
      setIsValid(valid);
      setPhoneNumberRef.current(valid ? fullNumber : "");
    } catch {
      setIsValid(false);
      setPhoneNumberRef.current("");
    }
  }, [countryCode, phoneDigits]);

  const handleChange = (e) => {
    setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10));
  };

  const handleBlur = () => setTouched(true);

  const errorId = `${id}-error`;
  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode);
  // Afficher l'erreur uniquement après que l'utilisateur a quitté le champ
  const showError = touched && isValid === false;

  return (
    <div>
      <InputGroup>
        <InputGroupAddon>
          <Phone className="size-4 text-muted-foreground" />
        </InputGroupAddon>

        <Select value={countryCode} onValueChange={setCountryCode}>
          <SelectTrigger className="w-[100px] flex-none rounded-none border-0 border-r bg-transparent shadow-none focus-visible:ring-0">
            <SelectValue>
              {selectedCountry?.flag} {countryCode}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="flex items-center gap-2">
                  <span>{c.flag}</span>
                  <span>{c.code}</span>
                  <span className="text-xs text-muted-foreground">{c.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <InputGroupInput
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={placeholder}
          value={phoneDigits}
          onChange={handleChange}
          onBlur={handleBlur}
          required={required}
          aria-describedby={showError ? errorId : undefined}
          aria-invalid={showError ? "true" : undefined}
          className="flex-1"
        />

        <InputGroupAddon>
          {isValid === null || !touched ? (
            <div className="size-4" />
          ) : isValid ? (
            <Check className="size-4 text-green-600 dark:text-green-400" />
          ) : (
            <X className="size-4 text-destructive" />
          )}
        </InputGroupAddon>
      </InputGroup>

      {showError && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-destructive">
          Numéro invalide pour {selectedCountry?.name} ({countryCode})
        </p>
      )}
    </div>
  );
};

export default PhoneTaker;

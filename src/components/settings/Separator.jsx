import { cn } from "@/lib/utils";

const Separator = ({ className }) => {
  return (
    <div
      className={cn(
        "shrink-0 bg-border h-[1px] w-full",
        className
      )}
    />
  );
};

export default Separator;

"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { AIModel } from "@/app/api/ai/ask/validator";

interface ModelSelectorProps {
	value: AIModel;
	onChange: (model: AIModel) => void;
	disabled?: boolean;
}

const MODEL_LABELS: Record<AIModel, string> = {
	"gpt-oss-120b": "GPT-OSS 120B",
	"kimi-k2": "Kimi K2",
};

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					disabled={disabled}
					className="gap-1 h-7 text-xs"
				>
					{MODEL_LABELS[value]}
					<ChevronDown className="h-3 w-3" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuRadioGroup
					value={value}
					onValueChange={(v) => onChange(v as AIModel)}
				>
					<DropdownMenuRadioItem value="kimi-k2">
						Kimi K2
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="gpt-oss-120b">
						GPT-OSS 120B
					</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

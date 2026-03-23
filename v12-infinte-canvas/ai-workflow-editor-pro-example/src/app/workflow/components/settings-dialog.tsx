'use client';

import { Moon, Settings2, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import React, { useCallback, useEffect, useState } from 'react';

import { setOpenAIApiKeyCookie } from '@/app/actions/cookies';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

function SettingsItem({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-row items-center justify-between rounded-lg border p-4 mb-2">
      <div className="space-y-0.5">
        <span className="text-base font-bold">{title}</span>
        <p>{description}.</p>
      </div>
      {children}
    </div>
  );
}

function TextItem({
  title,
  description,
  onChange,
  value,
  className,
  ...props
}: {
  title: string;
  description: string;
  value: string;
  onChange: (text: string) => void;
  className?: string;
} & Omit<React.ComponentProps<'div'>, 'onChange'>) {
  const [text, setText] = useState<string>(value);

  const onTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 rounded-lg w-full border p-4 mb-2',
        className,
      )}
      {...props}
    >
      <div className="space-y-0.5">
        <span className="text-base font-bold">{title}</span>
        <p>{description}.</p>
      </div>
      <div className="w-full" style={{ minWidth: 0 }}>
        <Textarea
          className="w-full resize-none min-h-16 max-h-80 overflow-hidden whitespace-pre-wrap break-words"
          placeholder="Enter your OpenAI API key"
          onChange={onTextChange}
          value={text}
        />
      </div>
    </div>
  );
}

export function SettingsDialog() {
  const { setTheme } = useTheme();

  // Store the OpenAI API key in state, initialize as empty string
  const [openAIApiKey, setOpenAIApiKey] = useState<string>('');

  // Read the OpenAI API key from the cookies on client side only.
  // `useEffect` ensures this runs only on the client side with nextjs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key =
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('openAIApiKey='))
          ?.split('=')[1] || '';
      setOpenAIApiKey(key);
    }
  }, []);

  const [alertOpen, setAlertOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [hasKey, setHasKey] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!openAIApiKey) {
        setAlertOpen(true);
        setHasKey(false);
      } else {
        setHasKey(true);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [openAIApiKey]);

  return (
    <>
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogTrigger asChild></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>OpenAI API key is not set.</AlertDialogTitle>
            <AlertDialogDescription>
              To use this example, you need to set your OpenAI API key. <br />
              You can find your API key in the OpenAI dashboard. <br />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setAlertOpen(false);
                setSettingsOpen(true);
              }}
            >
              Open Settings
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => setAlertOpen(false)}>
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isSettingsOpen} onOpenChange={setSettingsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full',
              hasKey
                ? ''
                : 'animate-pulse text-destructive hover hover:bg-foreground/10 hover:text-destructive',
            )}
          >
            <Settings2 className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="mb-2">Settings</DialogTitle>
          </DialogHeader>

          <SettingsItem
            title="Color mode"
            description="Toggle between dark, light or system color mode."
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SettingsItem>

          <TextItem
            className={openAIApiKey ? '' : 'text-destructive'}
            title="OpenAI API Key"
            description="To use this example, you need an OpenAI API Key"
            value={openAIApiKey ?? ''}
            onChange={(key) => {
              setOpenAIApiKey(key);
              setOpenAIApiKeyCookie(key);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

import React from "react";
import { Group } from "@mantine/core";
import s from "./Header.module.css";
import type { Data } from "../scripts/types";

interface HeaderProps {
  data: Data;
  currentFormIndex: number;
  setCurrentFormIndex: React.Dispatch<React.SetStateAction<number>>;
}

export default function Header({
  data,
  currentFormIndex,
  setCurrentFormIndex,
}: HeaderProps) {
  const currentForm = data.forms[currentFormIndex];

  function findRelatedForm(formId: string) {
    return (
      data.forms.find(
        (form) =>
          form.formSetGuid === currentForm.formSetGuid &&
          parseInt(form.formId) === parseInt(formId),
      ) ??
      data.forms.find(
        (form) => parseInt(form.formId) === parseInt(formId),
      )
    );
  }

  return (
    <>
      {currentFormIndex >= 0 && (
        <div className={s.root}>
          <Group gap="xs">
            {currentForm.referencedIn.length > 0 && (
              <>
                {currentForm.referencedIn.map((formId) => {
                  const referencedForm = findRelatedForm(formId);
                  const formIndex = referencedForm
                    ? data.forms.indexOf(referencedForm)
                    : -1;

                  return (
                    <div
                      key={
                        (currentForm.formSetGuid ?? "") +
                        currentForm.formId +
                        formId
                      }
                      className={s.pointer}
                      onClick={() => {
                        if (formIndex >= 0) {
                          setCurrentFormIndex(formIndex);

                          document
                            .getElementById(`nav-${formIndex.toString()}`)
                            ?.scrollIntoView();
                        }
                      }}
                    >
                      {referencedForm?.name}
                    </div>
                  );
                })}
                <div>{">"}</div>
              </>
            )}
            <div>{currentForm.name}</div>
          </Group>
        </div>
      )}
    </>
  );
}

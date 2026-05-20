/**
 * WorkflowStepper
 * Indicateur visuel de progression du workflow BSD (9 étapes)
 */

import React from 'react';
import { CheckCircle2, Circle, Lock } from 'lucide-react';
import {
  WORKFLOW_STEPS,
  isStepComplete,
  getCurrentStep,
  getWorkflowProgress,
  getStepBadge,
  type WorkflowStep,
} from '@/features/exploitation/services/workflowService';

interface WorkflowStepperProps {
  bsdData: any;
  currentUserRole: string;
  compactMode?: boolean; // Mode compact pour affichage dans un header
}

export default function WorkflowStepper({
  bsdData,
  currentUserRole,
  compactMode = false,
}: WorkflowStepperProps) {
  const currentStep = getCurrentStep(bsdData);
  const progress = getWorkflowProgress(bsdData);

  if (compactMode) {
    return (
      <>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="text-xs font-bold text-gray-500">PROGRESSION</div>
            <div className="flex -space-x-1">
              {WORKFLOW_STEPS.map((step) => {
                const complete = isStepComplete(step.step, bsdData);
                const isCurrent = step.step === currentStep;
                const badge = getStepBadge(step.step);

                return (
                  <div
                    key={step.step}
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                      complete
                        ? 'border-white bg-green-500 text-white'
                        : isCurrent
                          ? `${badge.bg} border-white ${badge.color}`
                          : 'border-white bg-gray-100 text-gray-400'
                    }`}
                    title={step.label}
                  >
                    {step.step}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-6 w-px bg-gray-200" />

          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-green-600">{progress}%</div>
            <div className="text-xs text-gray-500">Étape {currentStep}/9</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Progression du Workflow</h3>
            <p className="text-sm text-gray-500">
              {progress === 100 ? 'Workflow complet ✅' : `Étape ${currentStep} sur 9 en cours`}
            </p>
          </div>
          <div className="text-4xl font-bold text-green-600">{progress}%</div>
        </div>

        {/* Progress Bar */}
        <div className="relative mb-8 h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {WORKFLOW_STEPS.map((step, idx) => {
            const complete = isStepComplete(step.step, bsdData);
            const isCurrent = step.step === currentStep;
            const badge = getStepBadge(step.step);
            const isLocked = step.step > currentStep;

            return (
              <div
                key={step.step}
                className={`flex items-start gap-4 rounded-xl border-2 p-4 transition-all ${
                  complete
                    ? 'border-green-200 bg-green-50'
                    : isCurrent
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-100 bg-gray-50'
                }`}
              >
                {/* Icon */}
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold ${
                    complete
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? `${badge.bg} ${badge.color}`
                        : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {complete ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isLocked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <span>{step.step}</span>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h4
                      className={`text-sm font-bold ${
                        complete ? 'text-green-900' : isCurrent ? 'text-blue-900' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </h4>
                    <span className="text-xs">{badge.icon}</span>
                    {step.autoFilled && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        AUTO
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs ${
                      complete ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-gray-500'
                    }`}
                  >
                    {step.description}
                  </p>

                  {/* Role Badge */}
                  <div className="mt-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${badge.bg} ${badge.color}`}
                    >
                      {step.role === 'bureau'
                        ? '🏢 Bureau'
                        : step.role === 'chauffeur'
                          ? '🚛 Chauffeur'
                          : '📦 Réception'}
                    </span>
                  </div>
                </div>

                {/* Connector Line */}
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <div className="absolute left-9 mt-12 h-8 w-0.5 bg-gray-200" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

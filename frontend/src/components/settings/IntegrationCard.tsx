import { Button } from "../ui/button";
import { Card } from "../ui/card";

function IntegrationCard({ cardDetails, onConnect }) {
  return (
    <Card className="w-full max-w-sm h-full max-h-80 p-4 hover:shadow-lg transition-shadow">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={`http://localhost:5000${cardDetails.iconUrl}`}
              alt={cardDetails.displayName}
              className="w-8 h-8"
            />
            <h3 className="text-xl font-semibold">{cardDetails.displayName}</h3>
          </div>
          {cardDetails.isEnabled && (
            <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-200 rounded-sm">
              Active
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 leading-relaxed text-wrap">
          {cardDetails.description}
        </p>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="capitalize font-medium">
              {cardDetails.provider}
            </span>
            <span>•</span>
            <span className="uppercase">{cardDetails.authType}</span>
          </div>

          <Button onClick={onConnect}>Connect</Button>
        </div>
      </div>
    </Card>
  );
}

export default IntegrationCard;
